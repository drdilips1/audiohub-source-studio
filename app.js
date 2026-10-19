const $ = id => document.getElementById(id);
const fields = ["name","type","providerId","description","url","method","responseFormat","headers","body","resultsPath","titleField","authorField","mediaField","coverField","idField","sizeField"];
const defaults = {
 audio:{name:"Public Audio Catalogue",type:"audio",providerId:"public-audio-catalogue",description:"Search a lawful audiobook catalogue.",url:"https://api.example.org/search?q={{query}}",method:"GET",responseFormat:"json",headers:"{}",body:'{"query":"{{query}}"}',resultsPath:"results",titleField:"title",authorField:"author",mediaField:"audio_url",coverField:"cover_url",idField:"id",sizeField:"duration"},
 debrid:{name:"Authorized Debrid Resolver",type:"debrid",providerId:"authorized-debrid-resolver",description:"Resolver configuration for an account-authorized debrid API.",url:"https://api.example.org/v1/resolve",method:"POST",responseFormat:"json",headers:'{"Content-Type":"application/json"}',body:'{"url":"{{query}}"}',resultsPath:"data",titleField:"filename",authorField:"",mediaField:"download_url",coverField:"",idField:"id",sizeField:"filesize"},
 ebook:{name:"Public Ebook Catalogue",type:"ebook",providerId:"public-ebook-catalogue",description:"Search a lawful ebook catalogue.",url:"https://api.example.org/search?q={{query}}",method:"GET",responseFormat:"json",headers:"{}",body:'{"query":"{{query}}"}',resultsPath:"results",titleField:"title",authorField:"authors",mediaField:"download_url",coverField:"cover_url",idField:"id",sizeField:"filesize"},
 metadata:{name:"Book Metadata API",type:"metadata",providerId:"book-metadata-api",description:"Retrieve book metadata from an authorized metadata API.",url:"https://api.example.org/books?q={{query}}",method:"GET",responseFormat:"json",headers:"{}",body:'{"query":"{{query}}"}',resultsPath:"items",titleField:"title",authorField:"authors",mediaField:"",coverField:"thumbnail",idField:"isbn",sizeField:""}
};
let activeTab = "builder";
function safeParse(text, label) { try { return JSON.parse(text || "{}"); } catch(e) { throw new Error(label + " must be valid JSON: " + e.message); } }
function readConfig() {
 const c = {}; fields.forEach(k => c[k] = $(k).value.trim());
 c.headers = safeParse(c.headers, "Headers");
 c.body = safeParse(c.body, "POST body");
 return c;
}
function manifest() {
 const c = readConfig();
 return {
   schema: "audiohub.source.v1",
   id: c.providerId || slug(c.name),
   name: c.name || "Untitled source",
   type: c.type,
   description: c.description,
   request: { url: c.url, method: c.method, responseFormat: c.responseFormat, headers: c.headers, ...(c.method === "POST" ? { body: c.body } : {}) },
   search: { queryToken: "{{query}}" },
   response: { resultsPath: c.resultsPath, fields: { title: c.titleField, author: c.authorField, mediaUrl: c.mediaField, coverUrl: c.coverField, id: c.idField, size: c.sizeField } },
   security: { credentials: "Do not embed private credentials in exported manifests; use a secure proxy or runtime secret." }
 };
}
function slug(s) { return (s||"source").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "source"; }
function updatePreview() {
 try {
   const m = manifest(); const out = JSON.stringify(m,null,2);
   $("jsonPreview").textContent = out;
   $("byteCount").textContent = new TextEncoder().encode(out).length + " bytes";
   $("sideName").textContent = m.name; $("sideType").textContent = ({audio:"Audiobook / audio",debrid:"Debrid resolver",ebook:"Ebook source",metadata:"Book metadata"})[m.type];
   $("providerId").classList.remove("invalid");
 } catch(e) {
   $("jsonPreview").textContent = "Configuration error\n\n" + e.message;
   $("byteCount").textContent = "Invalid configuration";
 }
}
function toast(msg) { const t=$("toast"); t.textContent=msg; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2200); }
function loadTemplate(type) {
 const c=defaults[type] || defaults.audio;
 fields.forEach(k=>{ if (c[k] !== undefined) $(k).value=c[k]; });
 updatePreview(); showTab("builder"); toast("Template loaded: "+c.name);
}
function showTab(tab) {
 activeTab=tab;
 document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
 ["builder","tester","templates"].forEach(v=>$(v+"View").classList.toggle("hidden",v!==tab));
 $("sectionTitle").textContent=({builder:"Source builder",tester:"API tester",templates:"Source templates"})[tab];
 $("sectionEyebrow").textContent=({builder:"CONFIGURATION",tester:"REQUEST INSPECTOR",templates:"STARTER CONFIGURATIONS"})[tab];
}
function getPath(obj,path) { if(!path) return obj; return path.split(".").filter(Boolean).reduce((v,k)=>v==null?undefined:v[k],obj); }
async function testApi(query,statusId,outputId) {
 let c;
 try { c=readConfig(); } catch(e) { $(statusId).textContent=e.message; $(statusId).className="status-message error"; return; }
 if(!c.url || c.url.includes("example.org")) { $(statusId).textContent="Replace the example.org URL with an API endpoint you are authorized to use."; $(statusId).className="status-message error"; return; }
 let url=c.url.replaceAll("{{query}}",encodeURIComponent(query));
 const opts={method:c.method,headers:c.headers};
 if(c.method==="POST") { opts.body=JSON.stringify(replaceToken(c.body,query)); if(!opts.headers["Content-Type"]) opts.headers["Content-Type"]="application/json"; }
 $(statusId).textContent="Sending request…"; $(statusId).className="status-message";
 $(outputId).textContent="";
 try {
   const response=await fetch(url,opts);
   const raw=await response.text();
   let data=raw; if(c.responseFormat==="json") { try { data=JSON.parse(raw); } catch { throw new Error("Response was not valid JSON (HTTP "+response.status+")."); } }
   if(!response.ok) throw new Error("HTTP "+response.status+" "+response.statusText+"\n"+(typeof raw==="string"?raw.slice(0,600):""));
   let resultSummary="";
   if(c.responseFormat==="json") {
     const results=getPath(data,c.resultsPath);
     resultSummary = Array.isArray(results) ? `\n\nMapped results found: ${results.length}` : "\n\nResults path did not resolve to an array. Check the mapping.";
   }
   $(statusId).textContent="Request succeeded · HTTP "+response.status+resultSummary;
   $(statusId).className="status-message success";
   $(outputId).textContent=typeof data==="string"?data:JSON.stringify(data,null,2);
 } catch(e) {
   const cors=/Failed to fetch|NetworkError|Load failed/i.test(e.message);
   $(statusId).textContent=(cors?"Request failed. This may be a CORS restriction; use the included Cloudflare Worker proxy for a domain you control or are authorized to access. ":"Request failed: ")+e.message;
   $(statusId).className="status-message error";
   $(outputId).textContent="No readable response received.\n\nBrowser requests can fail because of CORS, TLS, network rules, or provider authentication. Do not bypass provider restrictions; use the provider's official API or an authorized server-side integration.";
 }
}
function replaceToken(value,q) { if(typeof value==="string") return value.replaceAll("{{query}}",q); if(Array.isArray(value)) return value.map(v=>replaceToken(v,q)); if(value&&typeof value==="object") return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,replaceToken(v,q)])); return value; }
async function copyJson() { try { const s=JSON.stringify(manifest(),null,2); await navigator.clipboard.writeText(s); toast("JSON copied to clipboard"); } catch(e) { toast("Clipboard unavailable; select and copy the preview"); } }
function downloadJson() { try { const m=manifest(); const blob=new Blob([JSON.stringify(m,null,2)+"\n"],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=(m.id||"audiohub-source")+".json"; a.click(); URL.revokeObjectURL(a.href); toast("JSON export created"); } catch(e) { toast(e.message); } }
fields.forEach(k=>$(k).addEventListener("input",updatePreview));
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>showTab(b.dataset.tab)));
document.querySelectorAll(".template-card").forEach(b=>b.addEventListener("click",()=>loadTemplate(b.dataset.template)));
$("type").addEventListener("change",()=>{ const t=$("type").value; $("sideType").textContent=t; });
$("newSource").addEventListener("click",()=>loadTemplate("audio"));
$("exportTop").addEventListener("click",downloadJson); $("downloadJson").addEventListener("click",downloadJson); $("copyJson").addEventListener("click",copyJson);
$("testRequest").addEventListener("click",()=>testApi($("testQuery").value,"testStatus","testOutput"));
$("testRequest2").addEventListener("click",()=>testApi($("testQuery2").value,"testStatus2","testOutput2"));
$("testQuery").addEventListener("input",()=>{$("testQuery2").value=$("testQuery").value;});
$("testQuery2").addEventListener("input",()=>{$("testQuery").value=$("testQuery2").value;});
updatePreview();