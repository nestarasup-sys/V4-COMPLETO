(function () {
"use strict";
const C=window.GachaCore;
const $=id=>document.getElementById(id);
const s={project:C.freshProject(),slot:0,part:"head",page:"home",tool:"move",joints:true,grid:true,snap:false,zoom:100,undo:[],redo:[]};
let clock,sliderStart=null,numericStart=null;
const current=()=>s.project.slots[s.slot];
const editing=()=>{const ch=current();return ch?{...ch,pose:ch.workingPose}:null;};
const serialize=()=>JSON.stringify(s.project);
function autosave(){
 clearTimeout(clock);clock=setTimeout(()=>{
  const data=serialize();
  try{localStorage.setItem("gacha-v4-body-project",data);}catch(err){console.warn(err);}
  if(window.desktopAPI)window.desktopAPI.autosave(data).catch(console.warn);
 },260);
}
function history(before){
 if(before===serialize())return;
 s.undo.push(before);if(s.undo.length>80)s.undo.shift();s.redo.length=0;autosave();
}
function edit(fn){if(!current())return;const prev=serialize();fn(current());history(prev);render();}
function editDraft(fn){edit(ch=>fn(ch.workingPose,ch));}
function toast(msg){
 const el=$("toast");el.textContent=msg;el.classList.add("active");
 clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("active"),3000);
}
function showPage(page){
 s.page=page;
 $("page-home").hidden=page!=="home";$("page-pose").hidden=page!=="pose";
 $("breadcrumb-text").textContent=page==="home"?"Seu estúdio":"Personagens";
 $("breadcrumb-current").textContent=page==="home"?"Personagens":"Corpo / Pose";
 render();
}
function draw(){
 const ch=current();
 $("phone-preview").innerHTML=ch?C.renderSVG(ch,{preview:true}):'<p class="placeholder">Crie um personagem para começar.</p>';
 $("editor-stage").innerHTML=ch?C.renderSVG(editing(),{editor:true,joints:s.joints,selected:s.part,grid:s.grid}):'<p class="placeholder">Selecione um personagem.</p>';
 $("editor-stage").style.setProperty("--stage-zoom",s.zoom/100);
}
function drawStage(){
 const ch=editing();$("editor-stage").innerHTML=ch?C.renderSVG(ch,{editor:true,joints:s.joints,selected:s.part,grid:s.grid}):"";
 $("editor-stage").style.setProperty("--stage-zoom",s.zoom/100);
}
function renderInspector(){
 const ch=current(),p=C.BY_ID[s.part];
 $("part-list").innerHTML=ch?C.PARTS.map(item=>
  '<button class="part-item '+(item.id===s.part?"active":"")+'" data-part-select="'+item.id+'" aria-pressed="'+(item.id===s.part)+'"><span class="part-dot"></span><span>'+C.esc(item.name)+'</span><span class="part-arrow">›</span></button>'
 ).join(""):"";
 $("selected-piece-label").textContent=p.name;
 $("selection-description").textContent="Arraste para posicionar ou use os controles abaixo.";
 if(!ch){$("part-tools").textContent="Selecione um personagem.";return;}
 const v=ch.workingPose[s.part];
 const field=(name,id,val)=>'<label class="control-input"><span>'+name+'</span><input type="number" step="0.1" min="'+(id==="rotation"?-180:-600)+'" max="'+(id==="rotation"?180:600)+'" data-pose-field="'+id+'" value="'+val+'"></label>';
 $("part-tools").innerHTML=
  '<div class="tool-title"><span>PEÇA SELECIONADA</span><strong>'+C.esc(p.name)+'</strong></div>'+
  '<div class="rotation-heading"><span>Rotação</span><strong id="rotation-value">'+Math.round(v.rotation)+'°</strong></div>'+
  '<input id="rotation-slider" type="range" min="-180" max="180" step="1" value="'+v.rotation+'" aria-label="Ângulo de rotação">'+
  '<div class="field-grid">'+field("Posição X","x",v.x)+field("Posição Y","y",v.y)+field("Ângulo °","rotation",v.rotation)+'</div>'+
  '<span class="nudge-title">Encaixe fino · mover 1 pixel</span>'+
  '<div class="nudge-pad"><span class="empty"></span><button data-action="nudge:0:-1" aria-label="Mover 1 pixel para cima">↑</button><span class="empty"></span>'+
  '<button data-action="nudge:-1:0" aria-label="Mover 1 pixel para a esquerda">←</button><button data-action="align-part" aria-label="Reencaixar peça" title="Voltar ao ponto de conexão">◎</button><button data-action="nudge:1:0" aria-label="Mover 1 pixel para a direita">→</button>'+
  '<span class="empty"></span><button data-action="nudge:0:1" aria-label="Mover 1 pixel para baixo">↓</button><span class="empty"></span></div>'+
  '<div class="control-row"><button class="button outline" data-action="align-part">◎ Encaixar</button><button class="button muted" data-action="reset-part">↶ Restaurar</button></div>';
}
function renderSaved(){
 const ch=current();$("saved-pose-count").textContent=ch?ch.savedPoses.length:"0";
 $("saved-pose-list").innerHTML=ch&&ch.savedPoses.length?ch.savedPoses.map((entry,i)=>
  '<div class="saved-item"><div class="saved-pose-main"><span class="saved-thumb">'+C.renderSVG({...ch,pose:entry.pose},{preview:true})+'</span><span class="saved-name" title="'+C.esc(entry.name)+'">'+C.esc(entry.name)+'</span></div><div class="saved-pose-actions"><button data-action="load-saved:'+i+'" title="Carregar no editor sem aplicar">Editar</button><button data-action="duplicate-saved:'+i+'" aria-label="Duplicar '+C.esc(entry.name)+'" title="Duplicar">⧉</button><button data-action="rename-saved:'+i+'" aria-label="Renomear '+C.esc(entry.name)+'" title="Renomear">✎</button><button data-action="copy-saved:'+i+'" aria-label="Copiar '+C.esc(entry.name)+' para outro personagem" title="Copiar para outro personagem">↗</button><button data-action="export-saved:'+i+'" aria-label="Exportar '+C.esc(entry.name)+'" title="Exportar">⇩</button><button data-action="delete-saved:'+i+'" aria-label="Excluir '+C.esc(entry.name)+'" title="Excluir">×</button></div></div>'
 ).join(""):'<p class="empty-saved">Nenhuma pose salva ainda. Monte sua primeira pose e clique em Guardar.</p>';
}
function registerPoseSlot(entry){
 const slots=s.project.poseSlots;
 const existing=slots.find(slot=>slot&&slot.id===entry.id);
 if(existing){existing.name=entry.name;existing.pose=C.copyPose(entry.pose);return true;}
 const index=slots.findIndex(slot=>!slot);if(index<0)return false;
 slots[index]={id:entry.id,name:entry.name,pose:C.copyPose(entry.pose)};return true;
}
function renderHomePoseSlots(){
 const slots=s.project.poseSlots||Array(C.POSE_SLOT_COUNT).fill(null),ch=current(),previewBase=ch||C.makeCharacter(0);
 $("home-pose-count").textContent=slots.filter(Boolean).length+"/"+C.POSE_SLOT_COUNT;
 $("home-pose-slots").innerHTML=slots.map((entry,index)=>entry?
  '<button type="button" class="home-pose-slot occupied" data-action="apply-home-pose:'+index+'" aria-label="Aplicar pose '+C.esc(entry.name)+' ao personagem selecionado" title="'+C.esc(entry.name)+'" '+(!ch?"disabled":"")+'><span class="home-pose-thumb">'+C.renderSVG({...previewBase,pose:entry.pose},{preview:true})+'</span><span class="home-pose-slot-name">'+C.esc(entry.name)+'</span><span class="home-pose-slot-index">'+String(index+1).padStart(2,"0")+'</span></button>':
  '<button type="button" class="home-pose-slot empty" data-action="open-pose" aria-label="Slot de pose '+(index+1)+' vazio. Abrir editor para salvar pose" '+(!ch?"disabled":"")+'><span class="home-pose-empty-icon">＋</span><span class="home-pose-slot-name">Vazio</span><span class="home-pose-slot-index">'+String(index+1).padStart(2,"0")+'</span></button>'
 ).join("");
}
function render(){
 const ch=current();
 $("slot-grid").innerHTML=s.project.slots.map((item,i)=>'<button type="button" class="slot '+(s.slot===i?"selected ":"")+(item?"occupied":"empty")+'" data-slot="'+i+'" aria-label="Slot '+(i+1)+'" aria-pressed="'+(s.slot===i)+'">'+
  (item?'<span class="slot-figure">'+C.renderSVG(item,{preview:true})+'</span>':'<span class="slot-add">+</span>')+
  '<span class="slot-index">'+String(i+1).padStart(2,"0")+'</span></button>').join("");
 $("slot-count").textContent=s.project.slots.filter(Boolean).length+"/16";
 renderHomePoseSlots();
 $("hero-name").textContent=ch?ch.name:"Slot vazio";
 $("slot-position").textContent="SLOT "+String(s.slot+1).padStart(2,"0");
 $("pose-person-name").textContent=ch?ch.name:"Sem personagem";
 if(ch){$("character-name").value=ch.name;$("skin-color").value=ch.skin;}
 draw();renderInspector();renderSaved();
 $("undo-btn").disabled=s.undo.length===0;$("redo-btn").disabled=s.redo.length===0;
 document.querySelectorAll(".requires-character").forEach(b=>b.disabled=!ch);
 document.querySelectorAll("[data-tool]").forEach(b=>b.classList.toggle("active",b.dataset.tool===s.tool));
 $("joint-toggle").checked=s.joints;$("grid-toggle").checked=s.grid;$("snap-toggle").checked=s.snap;
 $("zoom-label").textContent=s.zoom+"%";$("zoom-range").value=s.zoom;
}
function selectSlot(i){
 if(i<0||i>=16)return;
 s.slot=i;
 if(!current()){const prev=serialize();s.project.slots[i]=C.makeCharacter(i,s.project.poseSlots[0]);history(prev);toast("Personagem criado no slot "+(i+1)+(s.project.poseSlots[0]?" com a pose do slot 01":""));}
 s.part="head";render();
}
function restore(kind){
 const from=kind==="undo"?s.undo:s.redo,to=kind==="undo"?s.redo:s.undo;
 if(!from.length)return;to.push(serialize());s.project=JSON.parse(from.pop());autosave();render();
}
function filename(ch,ext){return (ch?ch.name:"gacha-v4").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9_-]+/gi,"-").slice(0,45)+"."+ext;}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);}
async function saveJSON(){
 const text=JSON.stringify(s.project,null,2);
 if(window.desktopAPI){if(!await window.desktopAPI.saveText("gacha-corpo-v1.json",text))return;}
 else download(new Blob([text],{type:"application/json"}),"gacha-corpo-v1.json");
 toast("Projeto exportado.");
}
async function savePNG(){
 if(!current())return;
 const markup=C.renderSVG(current(),{}),url=URL.createObjectURL(new Blob([markup],{type:"image/svg+xml"}));
 try{
  const img=new Image();
  await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=url;});
  const canvas=document.createElement("canvas");canvas.width=C.WIDTH;canvas.height=C.HEIGHT;
  canvas.getContext("2d").drawImage(img,0,0);
  if(window.desktopAPI){if(!await window.desktopAPI.saveImage(filename(current(),"png"),canvas.toDataURL("image/png")))return;}
  else await new Promise(resolve=>canvas.toBlob(blob=>{download(blob,filename(current(),"png"));resolve();},"image/png"));
  toast("PNG transparente exportado.");
 }finally{URL.revokeObjectURL(url);}
}
async function loadJSON(){
 try{
  let txt;
  if(window.desktopAPI)txt=await window.desktopAPI.openText();
  else txt=await new Promise(resolve=>{const input=document.createElement("input");input.type="file";input.accept=".json";input.onchange=()=>{const file=input.files[0];if(file)file.text().then(resolve).catch(()=>resolve(null));else resolve(null);};input.click();});
  if(!txt)return;
  const next=C.normalize(JSON.parse(txt)),prev=serialize();
  s.project=next;history(prev);s.slot=Math.max(0,next.slots.findIndex(Boolean));s.part="head";showPage("home");toast("Projeto importado.");
 }catch(err){toast("Erro ao importar: "+err.message);}
}
function savePose(){
 const ch=current();if(!ch)return;
 if(ch.savedPoses.length>=40)return toast("Limite de 40 poses neste personagem.");
 const name=prompt("Nome da nova pose:", "Minha pose "+(ch.savedPoses.length+1));
 if(name===null)return;
 const clean=name.trim().slice(0,50);if(!clean)return toast("Digite um nome para a pose.");
 let inQuickSlots=false;
 edit(x=>{const entry=C.newPoseEntry(clean,x.workingPose);x.savedPoses.push(entry);inQuickSlots=registerPoseSlot(entry);});
 toast(inQuickSlots?"Pose \""+clean+"\" guardada nos slots rápidos.":"Pose guardada no personagem; os 12 slots rápidos estão cheios.");
}
async function importPose(){
 try{
  let text;
  if(window.desktopAPI)text=await window.desktopAPI.openText();
  else text=await new Promise(resolve=>{const input=document.createElement("input");input.type="file";input.accept=".json,application/json";input.onchange=()=>{const file=input.files?.[0];if(file)file.text().then(resolve).catch(()=>resolve(null));else resolve(null);};input.click();});
  if(!text)return;
  const data=JSON.parse(text),ch=current();
  if(data.format!=="gacha-pose-v1"||data.version!==1||!ch)throw new Error("Arquivo não contém uma pose gacha-pose-v1 válida.");
  if(ch.savedPoses.length>=40)throw new Error("Limite de 40 poses neste personagem.");
  const entry=C.newPoseEntry(String(data.name||"Pose importada").trim().slice(0,50)||"Pose importada",C.normalizePose(data.pose));
  let inQuickSlots=false;
  edit(character=>{character.savedPoses.push(entry);character.workingPose=C.copyPose(entry.pose);inQuickSlots=registerPoseSlot(entry);});
  toast(inQuickSlots?"Pose importada para o editor e os slots rápidos.":"Pose importada para o editor; os 12 slots rápidos estão cheios.");
 }catch(err){toast("Erro ao importar pose: "+err.message);}
}
async function exportPose(entry){
 const ch=current();if(!ch)return;
 const snapshot=entry||C.newPoseEntry(ch.name+" - rascunho",ch.workingPose);
 const json=JSON.stringify({format:"gacha-pose-v1",version:1,name:snapshot.name,pose:C.normalizePose(snapshot.pose)},null,2);
 if(window.desktopAPI){if(!await window.desktopAPI.saveText(filename(ch,"json").replace(/\.json$/i,"-pose.json"),json))return;}
 else download(new Blob([json],{type:"application/json"}),filename(ch,"pose.json"));
 toast("Pose exportada.");
}
function action(e){
 const b=e.target.closest("[data-action],[data-slot],[data-part-select],[data-tool]");if(!b)return;
 if(b.hasAttribute("data-slot")){selectSlot(Number(b.dataset.slot));return;}
 if(b.hasAttribute("data-part-select")){s.part=b.dataset.partSelect;render();return;}
 if(b.hasAttribute("data-tool")){s.tool=b.dataset.tool;render();return;}
 const k=b.dataset.action;
 if(k==="undo"||k==="redo")return restore(k);
 if(k==="open-pose"){if(current())showPage("pose");return;}
 if(k==="back-home"){showPage("home");return;}
 if(k==="new"){const i=s.project.slots.findIndex(v=>!v);return i===-1?toast("Os 16 slots já estão ocupados."):selectSlot(i);}
 if(k.startsWith("apply-home-pose:")){
  const entry=s.project.poseSlots[Number(k.slice(16))];if(!entry||!current())return;
  edit(ch=>{ch.pose=C.copyPose(entry.pose);ch.workingPose=C.copyPose(entry.pose);});toast("Pose aplicada ao personagem.");return;
 }
 if(k==="clone"){
  const i=s.project.slots.findIndex(v=>!v);if(!current()||i<0)return toast("Não há slots livres.");
  const before=serialize(),copy=JSON.parse(JSON.stringify(current()));copy.id="person-"+Date.now();copy.name=(copy.name+" (cópia)").slice(0,60);
  s.project.slots[i]=copy;s.slot=i;history(before);render();toast("Personagem duplicado.");return;
 }
 if(k==="delete"){
  if(!current()||!confirm("Excluir este personagem? Essa ação pode ser desfeita."))return;
  const before=serialize();s.project.slots[s.slot]=null;history(before);render();toast("Slot esvaziado.");return;
 }
 if(k==="mirror")return edit(ch=>{ch.mirrored=!ch.mirrored;});
 if(k==="export-json")return saveJSON();
 if(k==="export-png")return savePNG();
 if(k==="import-json")return loadJSON();
 if(k==="import-pose")return importPose();
 if(k==="export-pose")return exportPose();
 if(k==="reset-part")return editDraft(pose=>{const part=C.BY_ID[s.part];pose[s.part]={x:part.base[0],y:part.base[1],rotation:0};});
 if(k==="align-part")return editDraft(pose=>{const p=C.BY_ID[s.part];pose[s.part].x=p.base[0];pose[s.part].y=p.base[1];});
 if(k==="reset-pose")return editDraft((_pose,ch)=>{ch.workingPose=C.freshPose();});
 if(k.startsWith("nudge:")){
  const [,dx,dy]=k.split(":").map(Number);
  const scale=e.shiftKey?10:1;
  return editDraft(pose=>{const p=pose[s.part];p.x=C.clamp(p.x+dx*scale,-600,600);p.y=C.clamp(p.y+dy*scale,-600,600);});
 }
 if(k.startsWith("preset:"))return editDraft((_pose,ch)=>{ch.workingPose=C.freshPose();C.applyPreset({pose:ch.workingPose},k.slice(7));});
 if(k==="save-pose")return savePose();
 if(k==="apply-pose"){
  edit(ch=>{ch.pose=C.copyPose(ch.workingPose);});
  showPage("home");toast("Pose aplicada! A prévia inicial foi atualizada.");return;
 }
 if(k.startsWith("load-saved:")){
  const saved=current()?.savedPoses[Number(k.slice(11))];if(!saved)return;
  edit(ch=>{ch.workingPose=C.copyPose(saved.pose);});toast("Pose carregada só no editor.");return;
 }
 if(k.startsWith("duplicate-saved:")){
  const entry=current()?.savedPoses[Number(k.slice(16))];if(!entry)return;
  if(current().savedPoses.length>=40)return toast("Limite de 40 poses neste personagem.");
  let inQuickSlots=false;edit(ch=>{const copy=C.newPoseEntry(entry.name+" (cópia)",entry.pose);ch.savedPoses.push(copy);inQuickSlots=registerPoseSlot(copy);});toast(inQuickSlots?"Cópia salva na biblioteca e nos slots rápidos.":"Cópia salva na biblioteca; os slots rápidos estão cheios.");return;
 }
 if(k.startsWith("rename-saved:")){
  const index=Number(k.slice(13)),entry=current()?.savedPoses[index];if(!entry)return;
  const name=prompt("Novo nome da pose:",entry.name);if(name===null)return;
  const clean=name.trim().slice(0,50);if(!clean)return toast("Digite um nome para a pose.");
  edit(ch=>{ch.savedPoses[index].name=clean;const slot=s.project.poseSlots.find(item=>item&&item.id===entry.id);if(slot)slot.name=clean;});toast("Pose renomeada.");return;
 }
 if(k.startsWith("copy-saved:")){
  const entry=current()?.savedPoses[Number(k.slice(11))];if(!entry)return;
  const destination=prompt("Número do slot de destino (1–16):","");if(destination===null)return;
  const index=Number(destination)-1,target=s.project.slots[index];
  if(!Number.isInteger(index)||index<0||index>=C.SLOT_COUNT||!target)return toast("Escolha um slot ocupado entre 1 e 16.");
  if(target.savedPoses.length>=40)return toast("O personagem de destino já tem 40 poses salvas.");
  let inQuickSlots=false;edit(()=>{const copy=C.newPoseEntry(entry.name,entry.pose);target.savedPoses.push(copy);inQuickSlots=registerPoseSlot(copy);});
  toast(inQuickSlots?"Pose copiada e adicionada aos slots rápidos.":"Pose copiada; os slots rápidos estão cheios.");return;
 }
 if(k.startsWith("export-saved:"))return exportPose(current()?.savedPoses[Number(k.slice(13))]);
 if(k.startsWith("delete-saved:")){
  const index=Number(k.slice(13)),ch=current();if(!ch?.savedPoses[index]||!confirm("Excluir esta pose salva?"))return;
  edit(c=>{c.savedPoses.splice(index,1);const slot=s.project.poseSlots.findIndex(item=>item&&item.id===entry.id);if(slot>=0)s.project.poseSlots[slot]=null;});toast("Pose excluída.");return;
 }
}
function bind(){
 document.addEventListener("click",e=>{Promise.resolve().then(()=>action(e)).catch(err=>toast("Erro: "+err.message));});
 $("character-name").addEventListener("change",e=>edit(ch=>{ch.name=e.target.value.trim().slice(0,60)||ch.name;}));
 $("skin-color").addEventListener("change",e=>edit(ch=>{ch.skin=e.target.value;}));
 document.addEventListener("focusin",e=>{
  if(e.target.matches("[data-pose-field]")&&!numericStart)numericStart=serialize();
 });
 document.addEventListener("input",e=>{
  const key=e.target.dataset.poseField;if(!key||!current())return;
  if(e.target.value.trim()===""||e.target.value==="-"||e.target.value===".")return;
  const n=Number(e.target.value);if(!Number.isFinite(n))return;
  current().workingPose[s.part][key]=C.clamp(n,key==="rotation"?-180:-600,key==="rotation"?180:600);
  drawStage();
  if(key==="rotation")$("rotation-value").textContent=Math.round(n*10)/10+"°";
 });
 document.addEventListener("change",e=>{
  const key=e.target.dataset.poseField;if(!key||!current())return;
  const n=Number(e.target.value);if(!Number.isFinite(n)){e.target.value=current().workingPose[s.part][key];return toast("Valor inválido.");}
  const limit=key==="rotation"?180:600;
  current().workingPose[s.part][key]=C.clamp(n,-limit,limit);
  e.target.value=current().workingPose[s.part][key];
  history(numericStart||serialize());numericStart=null;drawStage();
  if(key==="rotation")$("rotation-value").textContent=Math.round(current().workingPose[s.part][key]*10)/10+"°";
 });
 document.addEventListener("pointerdown",e=>{if(e.target.id==="rotation-slider")sliderStart=serialize();});
 document.addEventListener("focusin",e=>{if(e.target.id==="rotation-slider"&&!sliderStart)sliderStart=serialize();});
 document.addEventListener("input",e=>{
  if(e.target.id!=="rotation-slider"||!current())return;
  current().workingPose[s.part].rotation=Number(e.target.value);
  $("rotation-value").textContent=e.target.value+"°";drawStage();
 });
 document.addEventListener("change",e=>{
  if(e.target.id!=="rotation-slider")return;
  history(sliderStart||serialize());sliderStart=null;render();
 });
 [["joint","joints"],["grid","grid"],["snap","snap"]].forEach(([id,key])=>{
  $(id+"-toggle").addEventListener("change",e=>{s[key]=e.target.checked;drawStage();});
 });
 $("zoom-range").addEventListener("input",e=>{
  s.zoom=Number(e.target.value);$("zoom-label").textContent=s.zoom+"%";
  $("editor-stage").style.setProperty("--stage-zoom",s.zoom/100);
 });
 document.addEventListener("keydown",e=>{
  if(e.target.closest("input,textarea,[contenteditable]"))return;
  const key=e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey)&&key==="z"){e.preventDefault();restore(e.shiftKey?"redo":"undo");return;}
  if((e.ctrlKey||e.metaKey)&&key==="y"){e.preventDefault();restore("redo");return;}
  if(s.page!=="pose")return;
  if(key==="r"||key==="v"){s.tool=key==="r"?"rotate":"move";render();return;}
  const arrows={arrowup:[0,-1],arrowdown:[0,1],arrowleft:[-1,0],arrowright:[1,0]};
  if(arrows[key]){e.preventDefault();const [x,y]=arrows[key];const step=e.shiftKey?10:1;
   editDraft(pose=>{pose[s.part].x=C.clamp(pose[s.part].x+x*step,-600,600);pose[s.part].y=C.clamp(pose[s.part].y+y*step,-600,600);});}
 });
}
async function init(){
 let saved=null;
 if(window.desktopAPI)try{saved=await window.desktopAPI.loadAutosave();}catch(err){console.warn(err);}
 if(!saved)try{saved=localStorage.getItem("gacha-v4-body-project");}catch(err){}
 if(saved)try{s.project=C.normalize(JSON.parse(saved));}catch(err){console.warn("Salvamento inválido",err);}
 bind();showPage("home");
}
window.GachaEditor={state:s,current,editing,draw:drawStage,render,serialize,history};
document.addEventListener("DOMContentLoaded",init);
})();
