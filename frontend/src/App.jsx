import { useEffect, useMemo, useState } from "react";
import {
  Search, Plus, LayoutDashboard, PackageSearch, ClipboardList, ShieldCheck,
  LogOut, Menu, X, MapPin, CalendarDays, ArrowUpRight, CheckCircle2,
  Clock3, AlertCircle, Trash2, ImagePlus, ChevronDown, Sparkles, UserRound
} from "lucide-react";
import { api, dateLabel } from "./api";

const emptyForm = { itemName: "", place: "", date: new Date().toISOString().slice(0, 10), description: "", type: "found" };

function App() {
  const [auth, setAuth] = useState(() => {
    try { return JSON.parse(localStorage.getItem("campusfind-auth") || "null"); } catch { return null; }
  });
  const [page, setPage] = useState("discover");
  const [items, setItems] = useState([]);
  const [mine, setMine] = useState([]);
  const [claims, setClaims] = useState([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [authRole, setAuthRole] = useState("student");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [showReport, setShowReport] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [claiming, setClaiming] = useState(null);
  const [claimMessage, setClaimMessage] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  const isAdmin = auth?.user?.role === "admin";

  useEffect(() => {
    if (auth) localStorage.setItem("campusfind-auth", JSON.stringify(auth));
    else localStorage.removeItem("campusfind-auth");
  }, [auth]);

  useEffect(() => {
    if (!auth) return;
    refresh();
  }, [auth]);

  useEffect(() => {
    if (!auth) return;
    const timer = setTimeout(() => loadItems(), 250);
    return () => clearTimeout(timer);
  }, [query, filter, auth]);

  async function loadItems() {
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("search", query.trim());
      if (filter !== "all") params.set("type", filter);
      const result = await api(`/items?${params.toString()}`, {}, auth?.token);
      setItems(result.items || []);
    } catch (e) { setError(e.message); }
  }

  async function refresh() {
    if (!auth) return;
    setLoading(true);
    try {
      const [all, own, myClaims] = await Promise.all([
        api("/items", {}, auth.token),
        api("/items/mine", {}, auth.token),
        api(isAdmin ? "/claims" : "/claims/mine", {}, auth.token),
      ]);
      setItems(all.items || []);
      setMine(own.items || []);
      setClaims(myClaims.claims || []);
    } catch (e) {
      setError(e.message);
      if (/session expired|invalid/i.test(e.message)) logout();
    } finally { setLoading(false); }
  }

  async function submitAuth(e) {
    e.preventDefault(); setError(""); setNotice("");
    try {
      if (authRole === "admin" && authMode === "register") throw new Error("Admin accounts are created by the server. Please use Admin login.");
      const endpoint = authMode === "register" ? "/auth/register" : "/auth/login";
      const result = await api(endpoint, { method: "POST", body: authForm });
      if (authRole === "admin" && result.user.role !== "admin") throw new Error("This account is not an admin account.");
      if (authRole === "student" && result.user.role === "admin") throw new Error("Please use the Admin login option.");
      setAuth(result); setPage("discover"); setAuthForm({ name: "", email: "", password: "" });
      setNotice(`Welcome${result.user.name ? `, ${result.user.name.split(" ")[0]}` : ""}!`);
    } catch (e) { setError(e.message); }
  }

  function logout() { setAuth(null); setItems([]); setMine([]); setClaims([]); setPage("discover"); }

  function chooseImage(file) {
    setImageFile(file || null);
    setPreview(file ? URL.createObjectURL(file) : "");
  }

  async function submitReport(e) {
    e.preventDefault(); setError(""); setNotice("");
    if (!imageFile) return setError("Please choose an item image.");
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, value));
    body.append("image", imageFile);
    try {
      await api("/items", { method: "POST", body }, auth.token);
      setShowReport(false); setForm(emptyForm); chooseImage(null);
      setNotice("Your report has been published."); setPage("my-items"); await refresh();
    } catch (e) { setError(e.message); }
  }

  async function submitClaim(itemId) {
    setError(""); setNotice("");
    try {
      await api(`/claims/${itemId}`, { method: "POST", body: { message: claimMessage } }, auth.token);
      setClaiming(null); setClaimMessage(""); setNotice("Claim submitted. The admin will review it."); await refresh();
    } catch (e) { setError(e.message); }
  }

  async function updateClaim(claimId, status) {
    setError(""); setNotice("");
    try { await api(`/claims/${claimId}`, { method: "PATCH", body: { status } }, auth.token); setNotice(`Claim ${status}.`); await refresh(); }
    catch (e) { setError(e.message); }
  }

  async function updateItemStatus(itemId, status) {
    try { await api(`/items/${itemId}/status`, { method: "PATCH", body: { status } }, auth.token); setNotice(`Item marked ${status}.`); await refresh(); }
    catch (e) { setError(e.message); }
  }

  async function deleteItem(itemId) {
    if (!window.confirm("Delete this item report? This cannot be undone.")) return;
    try { await api(`/items/${itemId}`, { method: "DELETE" }, auth.token); setNotice("Report deleted."); await refresh(); }
    catch (e) { setError(e.message); }
  }

  const stats = useMemo(() => ({
    all: items.length,
    found: items.filter(i => i.type === "found" && i.status === "available").length,
    lost: items.filter(i => i.type === "lost" && i.status === "available").length,
    claims: claims.filter(c => c.status === "pending").length,
  }), [items, claims]);

  if (!auth) {
    return <AuthScreen authMode={authMode} setAuthMode={setAuthMode} authRole={authRole} setAuthRole={setAuthRole}
      authForm={authForm} setAuthForm={setAuthForm} submitAuth={submitAuth} error={error} />;
  }

  const nav = [
    { id: "discover", label: "Discover items", icon: PackageSearch },
    { id: "my-items", label: "My reports", icon: ClipboardList },
    { id: "my-claims", label: isAdmin ? "Claim requests" : "My claims", icon: ShieldCheck },
  ];

  let title = page === "discover" ? "Discover items" : page === "my-items" ? (isAdmin ? "All item reports" : "My reports") : page === "my-claims" ? (isAdmin ? "Claim requests" : "My claims") : "Dashboard";

  return (
    <div className="app-shell">
      {mobileNav && <button className="mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Close menu" />}
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark"><PackageSearch size={23}/></div><div><b>CampusFind</b><span>LOST & FOUND</span></div><button className="icon-btn mobile-close" onClick={() => setMobileNav(false)}><X size={18}/></button></div>
        <div className="campus-label">CAMPUS SPACE</div>
        <button className={`nav-link ${page === "discover" ? "active" : ""}`} onClick={() => { setPage("discover"); setMobileNav(false); }}><LayoutDashboard size={18}/> Overview</button>
        {nav.map(n => <button key={n.id} className={`nav-link ${page === n.id ? "active" : ""}`} onClick={() => { setPage(n.id); setMobileNav(false); }}><n.icon size={18}/>{n.label}{n.id === "my-claims" && isAdmin && stats.claims > 0 && <span className="nav-count">{stats.claims}</span>}</button>)}
        {isAdmin && <div className="admin-note"><ShieldCheck size={17}/><span><b>Admin mode</b><small>You can manage reports and claims.</small></span></div>}
        <div className="sidebar-bottom"><div className="help-card"><Sparkles size={18}/><b>Lost something?</b><p>Search recent reports or add your own to help the campus community.</p><button onClick={() => { setShowReport(true); setForm({...emptyForm, type:"lost"}); }}>Report an item <ArrowUpRight size={15}/></button></div><div className="profile-row"><div className="avatar">{auth.user.name?.slice(0,1).toUpperCase()}</div><div className="profile-info"><b>{auth.user.name}</b><small>{isAdmin ? "Administrator" : "Student account"}</small></div><button className="icon-btn" onClick={logout} title="Log out"><LogOut size={17}/></button></div></div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-btn mobile-menu" onClick={() => setMobileNav(true)}><Menu size={20}/></button>
          <div className="breadcrumb">Campus community <span>/</span> <b>{title}</b></div>
          <div className="top-actions"><span className="secure-tag"><span/> Community portal</span><div className="top-avatar">{auth.user.name?.slice(0,1).toUpperCase()}</div></div>
        </header>
        <div className="content">
          <div className="page-heading"><div><div className="eyebrow">YOUR CAMPUS, CONNECTED</div><h1>{page === "discover" ? "Find what matters." : title}</h1><p>{page === "discover" ? "A little help from your campus community goes a long way." : page === "my-items" ? "Keep track of the belongings you've reported." : isAdmin ? "Review requests and help reunite people with their belongings." : "Track the claims you've submitted."}</p></div><button className="primary-btn" onClick={() => { setForm(emptyForm); setShowReport(true); }}><Plus size={18}/> Report an item</button></div>

          {error && <div className="alert error-alert"><AlertCircle size={17}/>{error}<button onClick={() => setError("")}><X size={16}/></button></div>}
          {notice && <div className="alert success-alert"><CheckCircle2 size={17}/>{notice}<button onClick={() => setNotice("")}><X size={16}/></button></div>}

          {page === "discover" && <>
            <section className="welcome-banner"><div className="banner-copy"><div className="banner-pill"><Sparkles size={14}/> CAMPUS COMMUNITY</div><h2>Lost something?<br/><em>Found something?</em></h2><p>Small acts make a big difference. Help a fellow student find their way back to what matters.</p><button className="banner-btn" onClick={() => { setForm(emptyForm); setShowReport(true); }}>Post a report <ArrowUpRight size={16}/></button></div><div className="banner-art"><div className="art-circle circle-one"/><div className="art-circle circle-two"/><div className="floating-card card-back"><span className="mini-icon purple"><PackageSearch size={19}/></span><span><b>Found it!</b><small>Someone's day, made.</small></span><CheckCircle2 size={17} className="art-check"/></div><div className="floating-card card-front"><span className="mini-icon orange"><Sparkles size={19}/></span><span><b>Community first</b><small>Good things find their way.</small></span></div><div className="art-star star-a">✳</div><div className="art-star star-b">✦</div></div></section>
            <div className="stats-grid"><StatCard label="Active listings" value={stats.all} note="Across the campus" icon={PackageSearch} color="violet"/><StatCard label="Found items" value={stats.found} note="Waiting to go home" icon={CheckCircle2} color="green"/><StatCard label="Lost reports" value={stats.lost} note="Help someone find it" icon={Search} color="orange"/><StatCard label={isAdmin ? "Pending claims" : "Your claims"} value={isAdmin ? stats.claims : claims.length} note={isAdmin ? "Need your attention" : "Submitted by you"} icon={Clock3} color="blue"/></div>
            <div className="section-head"><div><h2>Recent reports</h2><p>Explore the latest activity around campus.</p></div><button className="text-btn" onClick={() => setPage("my-items")}>View reports <ArrowUpRight size={15}/></button></div>
            <div className="filter-row"><div className="search-box"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by item, location, or details..."/>{query && <button onClick={() => setQuery("")}><X size={15}/></button>}</div><div className="filter-pills">{["all","found","lost"].map(f => <button key={f} className={filter===f?"selected":""} onClick={() => setFilter(f)}>{f==="all"?"All items":f==="found"?"Found items":"Lost items"}</button>)}</div></div>
            <ItemGrid items={items} isAdmin={isAdmin} auth={auth} claiming={claiming} setClaiming={setClaiming} claimMessage={claimMessage} setClaimMessage={setClaimMessage} submitClaim={submitClaim} deleteItem={deleteItem} updateItemStatus={updateItemStatus} mine={mine} />
          </>}

          {page === "my-items" && <><div className="section-head"><div><h2>{isAdmin ? "Campus item reports" : "Your reports"}</h2><p>{mine.length} report{mine.length===1?"":"s"} in this view</p></div><button className="primary-btn small" onClick={() => setShowReport(true)}><Plus size={16}/> New report</button></div><ItemGrid items={mine} isAdmin={isAdmin} auth={auth} claiming={claiming} setClaiming={setClaiming} claimMessage={claimMessage} setClaimMessage={setClaimMessage} submitClaim={submitClaim} deleteItem={deleteItem} updateItemStatus={updateItemStatus} mine={mine} /></>}

          {page === "my-claims" && (isAdmin ? <AdminClaims claims={claims} updateClaim={updateClaim} /> : <StudentClaims claims={claims} />)}
          {loading && <div className="loading-line"><span/> Updating your campus board…</div>}
          <footer className="footer"><span>© {new Date().getFullYear()} CampusFind</span><span>Made for a more helpful campus <span className="footer-heart">♥</span></span></footer>
        </div>
      </main>
      {showReport && <ReportModal form={form} setForm={setForm} preview={preview} chooseImage={chooseImage} submitReport={submitReport} close={() => { setShowReport(false); chooseImage(null); }} error={error} isAdmin={isAdmin}/>}
    </div>
  );
}

function AuthScreen({ authMode, setAuthMode, authRole, setAuthRole, authForm, setAuthForm, submitAuth, error }) {
  return <div className="auth-page"><div className="auth-left"><div className="brand auth-brand"><div className="brand-mark"><PackageSearch size={23}/></div><div><b>CampusFind</b><span>LOST & FOUND</span></div></div><div className="auth-pitch"><div className="banner-pill"><Sparkles size={14}/> THE CAMPUS COMMUNITY BOARD</div><h1>Lost things.<br/><em>Found connections.</em></h1><p>A simpler way to reunite people with the things they thought were gone. One campus, looking out for each other.</p><div className="auth-perks"><div><CheckCircle2 size={17}/> Easy item reporting</div><div><CheckCircle2 size={17}/> Community-powered returns</div><div><CheckCircle2 size={17}/> Safe claim review</div></div></div><div className="auth-bottom">A little kindness goes a long way. <span>✳</span></div></div><div className="auth-right"><div className="auth-card"><div className="auth-icon"><PackageSearch size={25}/></div><h2>{authMode==="login"?"Welcome back":"Join your campus"}</h2><p>{authMode==="login"?"Sign in to continue to your campus board.":"Create your student account to get started."}</p><div className="role-switch"><button className={authRole==="student"?"active":""} onClick={() => {setAuthRole("student");setAuthMode("login");}}>Student</button><button className={authRole==="admin"?"active":""} onClick={() => {setAuthRole("admin");setAuthMode("login");}}>Admin</button></div><form onSubmit={submitAuth} className="auth-form">{authMode==="register"&&<label>Full name<input required value={authForm.name} onChange={e=>setAuthForm({...authForm,name:e.target.value})} placeholder="Your full name"/></label>}<label>Email address<input required type="email" value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})} placeholder={authRole==="admin"?"admin@college.edu":"you@college.edu"}/></label><label>Password<input required type="password" minLength={authMode==="register"?8:1} value={authForm.password} onChange={e=>setAuthForm({...authForm,password:e.target.value})} placeholder={authMode==="register"?"At least 8 characters":"Enter your password"}/></label>{error&&<div className="form-error"><AlertCircle size={15}/>{error}</div>}<button className="primary-btn auth-submit" type="submit">{authMode==="login"?"Sign in":"Create account"}<ArrowUpRight size={17}/></button></form>{authRole==="student"&&<div className="auth-toggle">{authMode==="login"?"New to CampusFind?":"Already have an account?"} <button onClick={()=>setAuthMode(authMode==="login"?"register":"login")}>{authMode==="login"?"Create account":"Sign in"}</button></div>}{authRole==="admin"&&<div className="auth-hint"><ShieldCheck size={15}/> Admin accounts are managed by the server.</div>}<div className="auth-privacy"><ShieldCheck size={14}/> Your account is protected with secure authentication.</div></div></div></div>;
}

function StatCard({ label, value, note, icon: Icon, color }) {
  return <div className="stat-card"><div className={`stat-icon ${color}`}><Icon size={19}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>;
}

function ItemGrid({ items, isAdmin, auth, claiming, setClaiming, claimMessage, setClaimMessage, submitClaim, deleteItem, updateItemStatus, mine }) {
  if (!items.length) return <div className="empty-state"><div className="empty-icon"><PackageSearch size={27}/></div><h3>Nothing here just yet</h3><p>Try a different search or be the first to report an item.</p></div>;
  return <div className="item-grid">{items.map(item => <article className="item-card" key={item._id}><div className="item-image-wrap"><img src={item.imageUrl} alt={item.itemName} className="item-image"/><span className={`type-badge ${item.type}`}>{item.type==="found"?"Found item":"Lost item"}</span>{item.status!=="available"&&<span className={`status-badge ${item.status}`}>{item.status}</span>}</div><div className="item-body"><div className="item-title-row"><h3>{item.itemName}</h3><span className="item-arrow"><ArrowUpRight size={16}/></span></div><div className="item-meta"><span><MapPin size={14}/>{item.place}</span><span><CalendarDays size={14}/>{dateLabel(item.date)}</span></div>{item.description&&<p className="item-description">{item.description}</p>}<div className="item-footer"><span className="reporter"><span className="reporter-dot">{item.reportedBy?.name?.slice(0,1)||"C"}</span>{item.reportedBy?.name||"Campus member"}</span>{!isAdmin&&item.type==="found"&&item.status==="available"&&String(item.reportedBy?._id)!==String(auth.user.id)&&<button className="claim-btn" onClick={()=>{setClaiming(claiming===item._id?null:item._id);setClaimMessage("");}}>{claiming===item._id?"Cancel claim":"This is mine"}</button>}</div>{claiming===item._id&&<div className="claim-form"><label>Help us verify your claim<textarea value={claimMessage} onChange={e=>setClaimMessage(e.target.value)} placeholder="Describe a detail that helps identify this item..." rows="2"/></label><button className="primary-btn small" onClick={()=>submitClaim(item._id)}>Submit claim</button></div>}{(isAdmin||String(item.reportedBy?._id)===String(auth.user.id))&&<div className="card-admin-actions">{isAdmin&&<select aria-label="Item status" value={item.status} onChange={e=>updateItemStatus(item._id,e.target.value)}><option value="available">Available</option><option value="claimed">Claimed</option><option value="returned">Returned</option><option value="closed">Closed</option></select>}<button className="delete-btn" onClick={()=>deleteItem(item._id)}><Trash2 size={14}/> Delete report</button></div>}</div></article>)}</div>;
}

function StudentClaims({ claims }) {
  if (!claims.length) return <div className="empty-state"><div className="empty-icon"><ShieldCheck size={27}/></div><h3>No claims yet</h3><p>When you spot an item that belongs to you, submit a claim from its card.</p></div>;
  return <div className="claims-list">{claims.map(c=><div className="claim-row" key={c._id}><img src={c.item?.imageUrl} alt={c.item?.itemName||"Item"} /><div className="claim-main"><b>{c.item?.itemName||"Deleted item"}</b><span><MapPin size={14}/>{c.item?.place||"—"} · Submitted {dateLabel(c.createdAt)}</span>{c.message&&<p>{c.message}</p>}</div><span className={`claim-status ${c.status}`}>{c.status}</span></div>)}</div>;
}

function AdminClaims({ claims, updateClaim }) {
  if (!claims.length) return <div className="empty-state"><div className="empty-icon"><ShieldCheck size={27}/></div><h3>All caught up</h3><p>New student claims will appear here for review.</p></div>;
  return <div className="claims-list">{claims.map(c=><div className="claim-row admin-claim" key={c._id}><img src={c.item?.imageUrl} alt={c.item?.itemName||"Item"}/><div className="claim-main"><b>{c.item?.itemName||"Deleted item"}</b><span><UserRound size={14}/>{c.student?.name} · {c.student?.email}</span><span><MapPin size={14}/>{c.item?.place||"—"} · {dateLabel(c.createdAt)}</span>{c.message&&<p>“{c.message}”</p>}</div><div className="claim-controls"><span className={`claim-status ${c.status}`}>{c.status}</span>{c.status==="pending"&&<div><button className="approve-btn" onClick={()=>updateClaim(c._id,"approved")}><CheckCircle2 size={14}/> Approve</button><button className="reject-btn" onClick={()=>updateClaim(c._id,"rejected")}>Reject</button></div>}</div></div>)}</div>;
}

function ReportModal({ form, setForm, preview, chooseImage, submitReport, close, error }) {
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close();}}><div className="report-modal"><div className="modal-heading"><div><div className="eyebrow">CAMPUS COMMUNITY</div><h2>Report an item</h2><p>Share a few details to help it find its way.</p></div><button className="icon-btn" onClick={close}><X size={20}/></button></div><form onSubmit={submitReport}><div className="type-select"><button type="button" className={form.type==="found"?"selected":""} onClick={()=>setForm({...form,type:"found"})}><CheckCircle2 size={17}/><span><b>I found something</b><small>Help return an item to its owner</small></span></button><button type="button" className={form.type==="lost"?"selected":""} onClick={()=>setForm({...form,type:"lost"})}><Search size={17}/><span><b>I lost something</b><small>Let others help you find it</small></span></button></div><div className="form-grid"><label className="full-field">Item name<input required maxLength="120" value={form.itemName} onChange={e=>setForm({...form,itemName:e.target.value})} placeholder="e.g. Black wireless headphones"/></label><label>Where?<input required maxLength="160" value={form.place} onChange={e=>setForm({...form,place:e.target.value})} placeholder="e.g. Library, second floor"/></label><label>Date<input required type="date" value={form.date} max={new Date().toISOString().slice(0,10)} onChange={e=>setForm({...form,date:e.target.value})}/></label><label className="full-field">Description <span className="optional">(optional)</span><textarea maxLength="1000" rows="3" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Color, brand, identifying details..."/></label><div className="full-field"><span className="field-label">Item photo <span className="optional">· Required, max 5 MB</span></span><label className="upload-zone">{preview?<img className="upload-preview" src={preview} alt="Preview"/>:<div className="upload-placeholder"><ImagePlus size={25}/><b>Choose an image</b><span>JPG, PNG, WEBP · up to 5 MB</span></div>}<input type="file" accept="image/*" required={!preview} onChange={e=>chooseImage(e.target.files?.[0])}/>{preview&&<span className="change-photo">Change photo</span>}</label></div></div>{error&&<div className="form-error"><AlertCircle size={15}/>{error}</div>}<div className="modal-actions"><button type="button" className="secondary-btn" onClick={close}>Cancel</button><button type="submit" className="primary-btn"><Plus size={17}/> Publish report</button></div></form></div></div>;
}

export default App;
