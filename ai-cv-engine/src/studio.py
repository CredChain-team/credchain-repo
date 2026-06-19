# ─────────────────────────────────────────────────────────────
# CredChain — CV Studio page
# A polished single-page UI (form + live preview) for the demo.
# Served as static HTML; it calls POST /generate-cv/image itself.
# ─────────────────────────────────────────────────────────────

STUDIO_HTML = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>CredChain · CV Studio</title>
<style>
  :root {
    --navy:#0f2040; --accent:#276ef1; --ink:#1f2530; --mute:#6e7781;
    --line:#e3e8f0; --bg:#f4f6fb; --white:#fff;
  }
  * { box-sizing:border-box; }
  body {
    margin:0; font-family:"Segoe UI",system-ui,Arial,sans-serif;
    color:var(--ink); background:var(--bg);
  }
  header {
    background:linear-gradient(120deg,#0f2040,#1b3a73);
    color:#fff; padding:22px 32px; display:flex; align-items:center; gap:14px;
    box-shadow:0 2px 14px rgba(15,32,64,.25);
  }
  header .logo {
    width:40px; height:40px; border-radius:10px; background:var(--accent);
    display:grid; place-items:center; font-weight:700; font-size:20px;
  }
  header h1 { font-size:20px; margin:0; }
  header p  { margin:2px 0 0; font-size:13px; opacity:.8; }
  .wrap {
    max-width:1150px; margin:28px auto; padding:0 24px;
    display:grid; grid-template-columns:380px 1fr; gap:28px;
  }
  @media (max-width:900px){ .wrap{ grid-template-columns:1fr; } }
  .card {
    background:var(--white); border:1px solid var(--line); border-radius:16px;
    padding:24px; box-shadow:0 6px 24px rgba(15,32,64,.06);
  }
  h2 { font-size:15px; text-transform:uppercase; letter-spacing:.5px;
       color:var(--navy); margin:0 0 16px; }
  label { display:block; font-size:13px; font-weight:600; margin:14px 0 6px; }
  input, textarea {
    width:100%; padding:10px 12px; border:1px solid var(--line);
    border-radius:10px; font:inherit; color:var(--ink); background:#fbfcfe;
  }
  input:focus, textarea:focus { outline:2px solid var(--accent); border-color:transparent; }
  textarea { resize:vertical; min-height:70px; }
  .hint { font-size:11px; color:var(--mute); margin-top:4px; }
  button {
    margin-top:22px; width:100%; padding:13px; border:0; border-radius:12px;
    background:var(--accent); color:#fff; font-size:15px; font-weight:600;
    cursor:pointer; transition:filter .15s;
  }
  button:hover { filter:brightness(1.07); }
  button:disabled { opacity:.6; cursor:wait; }
  .preview { display:grid; place-items:center; min-height:480px; }
  .preview img {
    max-width:100%; border-radius:12px; border:1px solid var(--line);
    box-shadow:0 8px 30px rgba(15,32,64,.15);
  }
  .placeholder { color:var(--mute); text-align:center; }
  .actions { display:flex; gap:10px; margin-top:16px; }
  .actions a {
    flex:1; text-align:center; text-decoration:none; padding:11px;
    border-radius:10px; border:1px solid var(--accent); color:var(--accent);
    font-weight:600; font-size:14px;
  }
  .actions a.hidden { display:none; }
</style>
</head>
<body>
  <header>
    <div class="logo">CC</div>
    <div>
      <h1>CredChain · CV Studio</h1>
      <p>Generate a designed CV image from student data</p>
    </div>
  </header>

  <div class="wrap">
    <!-- Form -->
    <section class="card">
      <h2>Student details</h2>
      <label>Full name</label>
      <input id="name" value="Ada Lovelace" />
      <label>Title</label>
      <input id="title" value="Mathematician & Programmer" />
      <label>Summary</label>
      <textarea id="summary">Pioneer of computing; wrote the first algorithm intended for a machine.</textarea>
      <label>Email</label>
      <input id="email" value="ada@credchain.io" />
      <label>Phone</label>
      <input id="phone" value="+44 20 1234 5678" />
      <label>Location</label>
      <input id="location" value="London, UK" />
      <label>Skills</label>
      <input id="skills" value="Python, Mathematics, Algorithms, Analysis" />
      <div class="hint">Separate skills with commas.</div>
      <label>Achievements</label>
      <textarea id="achievements">Authored the first published computer algorithm.
Translated and expanded the Analytical Engine notes.
Foresaw computers handling more than pure calculation.</textarea>
      <div class="hint">One achievement per line.</div>
      <button id="go" onclick="generate()">Generate CV image</button>
    </section>

    <!-- Preview -->
    <section class="card">
      <h2>Preview</h2>
      <div class="preview">
        <div id="placeholder" class="placeholder">
          Fill in the details and click <b>Generate CV image</b>.
        </div>
        <img id="cvimg" style="display:none" alt="Generated CV" />
      </div>
      <div class="actions">
        <a id="download" class="hidden" download="cv.png">Download PNG</a>
      </div>
    </section>
  </div>

<script>
async function generate() {
  const btn = document.getElementById('go');
  const val = id => document.getElementById(id).value;
  const lines = v => v.split('\\n').map(s => s.trim()).filter(Boolean);
  const csv   = v => v.split(',').map(s => s.trim()).filter(Boolean);

  const payload = {
    name: val('name'), title: val('title'), summary: val('summary'),
    email: val('email'), phone: val('phone'), location: val('location'),
    skills: csv(val('skills')), achievements: lines(val('achievements'))
  };

  btn.disabled = true; btn.textContent = 'Generating…';
  try {
    const res = await fetch('/generate-cv/image', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Server returned ' + res.status);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const img  = document.getElementById('cvimg');
    img.src = url; img.style.display = 'block';
    document.getElementById('placeholder').style.display = 'none';
    const dl = document.getElementById('download');
    dl.href = url; dl.classList.remove('hidden');
  } catch (e) {
    alert('Could not generate CV: ' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Generate CV image';
  }
}
</script>
</body>
</html>
"""
