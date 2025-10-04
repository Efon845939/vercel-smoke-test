// api/[...route].js — Single catch-all router for all endpoints on Vercel Hobby
// Serves:
//   POST   /api/login
//   POST   /api/signup
//   POST   /api/upload
//   POST   /api/retitle
//   DELETE /api/delete
//   GET    /api/projects
//   GET    /api/search-students
//   GET    /api/health-open
//   GET    /api/debug-supabase

const { setCORS } = require("./_cors");
const { signToken, getAuth } = require("./_jwt");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");
const cloudinary = require("cloudinary").v2;
const formidable = require("formidable");

// ---- ENV
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || "";
const FOLDER = process.env.CLOUDINARY_FOLDER || "steam4all";
const TEACHER_ACCESS_CODE = process.env.TEACHER_ACCESS_CODE || "StEaM4AlL";

// Full-name rule (letters incl. Turkish; at least two words)
const NAME_REGEX = /^([A-Za-zÇĞİÖŞÜçğıöşü]+)(\s+[A-Za-zÇĞİÖŞÜçğıöşü]+)+$/;

// ---- Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ---- Supabase (service role)
const sb = (SUPABASE_URL && SUPABASE_SERVICE_ROLE)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null;

// ---- utils
async function parseJSON(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function getUserByNameRole(name, role) {
  if (!sb) throw new Error("Supabase not configured");
  const n = String(name || "").trim().toLowerCase();
  const r = role === "teacher" ? "teacher" : "student";
  const { data, error } = await sb.from("users").select("*").eq("role", r).limit(200);
  if (error) throw error;
  return (data || []).find(x => (x.name || "").toLowerCase() === n) || null;
}

async function createUser(name, role, pin) {
  if (!sb) throw new Error("Supabase not configured");
  const hash = await bcrypt.hash(String(pin || ""), 10);
  const { data, error } = await sb
    .from("users")
    .insert({ name: String(name || "").trim(), role: role === "teacher" ? "teacher" : "student", pin_hash: hash })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function verifyUser(name, role, pin) {
  const row = await getUserByNameRole(name, role);
  if (!row) return null;
  const ok = await bcrypt.compare(String(pin || ""), row.pin_hash || "");
  return ok ? row : null;
}

function notAllowed(res) {
  res.statusCode = 405;
  res.end(JSON.stringify({ success:false, message:"Method not allowed" }));
}

// ---- endpoint handlers
async function handleSignup(req, res) {
  if (req.method !== "POST") return notAllowed(res);
  const body = await parseJSON(req);
  const nameRaw = String(body.name || "");
  const role    = body.role === "teacher" ? "teacher" : "student";
  const pin     = String(body.pin || "").trim();
  const teacherCode = String(body.teacherCode || "").trim();

  if (!NAME_REGEX.test(nameRaw.trim()))
    return res.end(JSON.stringify({ success:false, message:"Please enter your full name (letters only, at least two words)." }));
  if (!pin)
    return res.end(JSON.stringify({ success:false, message:"PIN is required." }));
  if (role === "teacher" && teacherCode !== TEACHER_ACCESS_CODE)
    return res.end(JSON.stringify({ success:false, message:"Invalid Teacher Access Code." }));

  const exists = await getUserByNameRole(nameRaw, role);
  if (exists) return res.end(JSON.stringify({ success:false, message:"User already exists. Please log in." }));

  const row = await createUser(nameRaw, role, pin);
  const token = signToken({ name: row.name, role: row.role }); // exact case preserved
  res.end(JSON.stringify({ success:true, token, role: row.role, name: row.name }));
}

async function handleLogin(req, res) {
  if (req.method !== "POST") return notAllowed(res);
  const body = await parseJSON(req);
  const nameRaw = String(body.name || "");
  const role    = body.role === "teacher" ? "teacher" : "student";
  const pin     = String(body.pin || "").trim();

  if (!NAME_REGEX.test(nameRaw.trim()))
    return res.end(JSON.stringify({ success:false, message:"Please enter your full name (letters only, at least two words)." }));
  if (!pin)
    return res.end(JSON.stringify({ success:false, message:"PIN is required." }));

  const row = await verifyUser(nameRaw, role, pin);
  if (!row) return res.end(JSON.stringify({ success:false, message:"Invalid name or PIN" }));

  const token = signToken({ name: row.name, role: row.role });
  res.end(JSON.stringify({ success:true, token, role: row.role, name: row.name }));
}

async function handleSearchStudents(req, res, url) {
  if (req.method !== "GET") return notAllowed(res);
  const q = (url.searchParams.get("q") || "").trim();
  if (!sb || q.length < 2) return res.end(JSON.stringify({ success:true, items: [] }));
  const { data, error } = await sb
    .from("users").select("name").eq("role","student").ilike("name", `%${q}%`).limit(10);
  if (error) throw error;
  res.end(JSON.stringify({ success:true, items:(data||[]).map(r=>r.name).filter(Boolean) }));
}

async function handleUpload(req, res) {
  if (req.method !== "POST") return notAllowed(res);
  const auth = getAuth(req);
  if (!auth || auth.role !== "student")
    return res.end(JSON.stringify({ success:false, message:"Please sign in as a student to upload." }));

  const form = new formidable.IncomingForm({ multiples:false, keepExtensions:true });
  const { fields, files } = await new Promise((resolve, reject) =>
    form.parse(req, (err, flds, fls) => (err ? reject(err) : resolve({ fields: flds, files: fls })))
  );

  const uploaderName = String(auth.name);
  const title  = String(fields.title || "").trim();
  const makersRequested = String(fields.makers || "")
    .split(",").map(s=>s.trim()).filter(Boolean);

  const makersValid = [];
  for (const m of makersRequested) {
    if (!NAME_REGEX.test(m)) continue;
    const row = await getUserByNameRole(m, "student");
    if (row) makersValid.push(row.name); // store DB exact case
  }

  const fileObj = files.projectFile || files.file || files.upload;
  const filepath =
    (fileObj && fileObj.filepath) ||
    (Array.isArray(fileObj) && fileObj[0] && fileObj[0].filepath);
  if (!filepath)
    return res.end(JSON.stringify({ success:false, message:'No file uploaded (field "projectFile")' }));

  const context = [
    `studentName=${uploaderName}`,
    title ? `title=${title}` : null,
    makersValid.length ? `makers=${makersValid.join("|")}` : null
  ].filter(Boolean).join("|");

  const result = await cloudinary.uploader.upload(filepath, {
    folder: FOLDER, resource_type:"auto", context
  });

  res.end(JSON.stringify({
    success:true,
    url: result.secure_url,
    public_id: result.public_id,
    resource_type: result.resource_type,
    studentName: uploaderName,
    title: title || null,
    makers: makersValid
  }));
}

async function handleRetitle(req, res) {
  if (req.method !== "POST") return notAllowed(res);
  const body = await parseJSON(req);
  const public_id = String(body.public_id || "").trim();
  const resource_type = body.resource_type === "video" ? "video" : "image";
  const title = String(body.title || "").trim();
  if (!public_id || !title)
    return res.end(JSON.stringify({ success:false, message:"public_id and title are required" }));

  await cloudinary.api.update(public_id, { resource_type, context: `title=${title}` });
  const fresh = await cloudinary.api.resource(public_id, { resource_type, context:true });
  const newTitle = fresh?.context?.custom?.title || null;
  res.end(JSON.stringify({ success: !!newTitle, public_id, title: newTitle }));
}

async function handleDelete(req, res) {
  if (req.method !== "DELETE" && req.method !== "POST") return notAllowed(res);
  const body = await parseJSON(req);
  const public_id = String(body.public_id || "").trim();
  const resource_type = body.resource_type === "video" ? "video" : "image";
  if (!public_id)
    return res.end(JSON.stringify({ success:false, message:"public_id is required" }));

  const result = await cloudinary.uploader.destroy(public_id, { resource_type });
  res.end(JSON.stringify({ success: result.result === "ok", result }));
}

async function handleProjects(req, res) {
  if (req.method !== "GET") return notAllowed(res);
  const auth = getAuth(req); // may be null

  const imgs = await cloudinary.api.resources({
    type:"upload", prefix:`${FOLDER}/`, max_results:100, resource_type:"image", context:true
  });
  const vids = await cloudinary.api.resources({
    type:"upload", prefix:`${FOLDER}/`, max_results:100, resource_type:"video", context:true
  });

  let resources = (imgs.resources||[]).concat(vids.resources||[]);
  resources.sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));

  let items = resources.map(r=>{
    const c = r.context && r.context.custom ? r.context.custom : {};
    const makers = c.makers ? String(c.makers).split("|").filter(Boolean) : [];
    return {
      public_id: r.public_id,
      url: r.secure_url,
      format: r.format,
      resource_type: r.resource_type,
      bytes: r.bytes,
      created_at: r.created_at,
      studentName: c.studentName || null,
      title: c.title || null,
      makers
    };
  });

  if (!auth) {
    items = []; // unsigned sees nothing
  } else if (auth.role === "student") {
    items = items.filter(i => i.studentName === auth.name || (i.makers || []).includes(auth.name));
  } // teacher sees all

  res.end(JSON.stringify({ success:true, count: items.length, items }));
}

async function handleHealthOpen(_req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.end(JSON.stringify({ ok:true, route:"health-open", time:new Date().toISOString() }));
}

async function handleDebugSupabase(_req, res) {
  const ok = !!sb;
  if (!ok) return res.end(JSON.stringify({ ok:false, reason:"missing-env" }));
  try {
    const { data, error } = await sb.from("users").select("id").limit(1);
    if (error) return res.end(JSON.stringify({ ok:false, reason:"query-error", error:String(error) }));
    res.end(JSON.stringify({ ok:true, reason:"connected", has_rows: Array.isArray(data)&&data.length>0 }));
  } catch (e) {
    res.end(JSON.stringify({ ok:false, reason:"exception", error:String(e) }));
  }
}

// ---- main handler (catch-all)
module.exports = async (req, res) => {
  try {
    setCORS(req, res);

    if (req.method === "OPTIONS") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ ok:true }));
    }

    res.setHeader("Content-Type", "application/json");

    const url = new URL(req.url, "http://localhost");
    const p = url.pathname; // e.g., /api/login

    if (p === "/api/login")            return await handleLogin(req, res);
    if (p === "/api/signup")           return await handleSignup(req, res);
    if (p === "/api/upload")           return await handleUpload(req, res);
    if (p === "/api/retitle")          return await handleRetitle(req, res);
    if (p === "/api/delete")           return await handleDelete(req, res);
    if (p === "/api/projects")         return await handleProjects(req, res);
    if (p === "/api/search-students")  return await handleSearchStudents(req, res, url);
    if (p === "/api/health-open")      return await handleHealthOpen(req, res);
    if (p === "/api/debug-supabase")   return await handleDebugSupabase(req, res);

    res.statusCode = 404;
    res.end(JSON.stringify({ success:false, message:"Not found", path:p }));
  } catch (err) {
    console.error("API error:", err);
    res.statusCode = 500;
    res.end(JSON.stringify({ success:false, message:"Server error" }));
  }
};
