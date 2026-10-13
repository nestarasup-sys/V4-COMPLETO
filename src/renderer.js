(function(){
"use strict";
var C=window.GachaCore,$=function(id){return document.getElementById(id);};
var s={project:C.freshProject(),slot:0,part:"head",tool:"rotate",joints:true,grid:false,snap:false,zoom:100,tab:"body",undo:[],redo:[]};
var clock;
function current(){return s.project.slots[s.slot];}
function serialize(){return JSON.stringify(s.project);}
function autosave(){clearTimeout(clock);clock=setTimeout(function(){var txt=serialize();try{localStorage.setItem("gacha-v4-body-project",txt);}catch(e){}if(window.desktopAPI)window.desktopAPI.autosave(txt).catch(console.warn);},250);}
function history(before){if(before===serialize())return;s.undo.push(before);if(s.undo.length>80)s.undo.shift();s.redo=[];autosave();}
function edit(fn){if(!current())return;var before=serialize();fn(current());history(before);render();}
function tell(t){var a=$("toast");a.textContent=t;a.classList.add("active");clearTimeout(tell.timer);tell.timer=setTimeout(function(){a.classList.remove("active");},3000);}
function draw(){
 var ch=current();
 $("phone-preview").innerHTML=ch?C.renderSVG(ch,{preview:true}):'<p class="placeholder">Selecione um slot</p>';
 $("editor-stage").innerHTML=ch?C.renderSVG(ch,{editor:true,joints:s.joints,selected:s.part,grid:s.grid}):'<p class="placeholder">Selecione um personagem</p>';
 $("editor-stage").style.setProperty("--stage-zoom",s.zoom/100);
}
function render(){
 $("slot-grid").innerHTML=s.project.slots.map(function(ch,i){return '<button type="button" class="slot '+(s.slot===i?"selected ":"")+(ch?"occupied":"empty")+'" data-slot="'+i+'" aria-label="Slot '+(i+1)+'" aria-pressed="'+(s.slot===i)+'">'+(ch?'<span class="slot-figure">'+C.renderSVG(ch,{preview:true})+'</span>':'<span class="slot-add">+</span>')+'<span class="slot-index">'+String(i+1).padStart(2,"0")+'</span></button>';}).join("");
 $("slot-count").textContent=s.project.slots.filter(Boolean).length+" / 16";
 draw();
 var ch=current();$("slot-title").textContent=ch?ch.name:"Slot vazio";$("slot-position").textContent="Slot "+String(s.slot+1).padStart(2,"0");
 $("part-list").innerHTML=ch?C.PARTS.map(function(p){return '<button class="part-item '+(p.id===s.part?"active":"")+'" data-part-select="'+p.id+'"><span class="part-dot"></span><span>'+C.esc(p.name)+'</span><span class="part-arrow">›</span></button>';}).join(""):"";
 if(ch){
   var p=C.BY_ID[s.part],v=ch.pose[s.part];
   $("part-tools").innerHTML='<div class="tool-title"><span>AJUSTE FINO</span><strong>'+C.esc(p.name)+'</strong></div><div class="rotation-heading"><span>Rotação</span><strong id="rotation-value">'+Math.round(v.rotation)+'°</strong></div><input type="range" id="rotation-slider" min="-180" max="180" step="1" value="'+v.rotation+'"><div class="field-grid">'+
   ["x","y","rotation"].map(function(k){return '<label class="control-input"><span>'+({x:"Posição X",y:"Posição Y",rotation:"Ângulo °"}[k])+'</span><input type="number" data-pose-field="'+k+'" min="'+(k==="rotation"?-180:-600)+'" max="'+(k==="rotation"?180:600)+'" value="'+v[k]+'"></label>';}).join("")+
   '</div><button class="subtle-btn" data-action="reset-part">↺ Restaurar esta peça</button>';
   $("character-name").value=ch.name;$("skin-color").value=ch.skin;
 }else{$("part-tools").textContent="Crie um personagem em um slot.";}
 $("undo-btn").disabled=s.undo.length===0;$("redo-btn").disabled=s.redo.length===0;
 document.querySelectorAll("[data-tool]").forEach(function(b){b.classList.toggle("active",b.dataset.tool===s.tool);});
 document.querySelectorAll("[data-tab]").forEach(function(b){b.classList.toggle("active",b.dataset.tab===s.tab);});
 $("panel-body").hidden=s.tab!=="body";$("panel-project").hidden=s.tab!=="project";
 $("joint-toggle").checked=s.joints;$("grid-toggle").checked=s.grid;$("snap-toggle").checked=s.snap;
 $("zoom-range").value=s.zoom;$("zoom-label").textContent=s.zoom+"%";
 $("empty-slot-message").hidden=!!ch;
 document.querySelectorAll(".requires-character").forEach(function(b){b.disabled=!ch;});
}
function slot(i){
 if(i<0||i>=16)return;s.slot=i;
 if(!current()){var prev=serialize();s.project.slots[i]=C.makeCharacter(i);history(prev);tell("Personagem criado no slot "+(i+1));}
 s.part="head";render();
}
function restore(step){
 var from=step==="undo"?s.undo:s.redo,to=step==="undo"?s.redo:s.undo;
 if(!from.length)return;to.push(serialize());s.project=JSON.parse(from.pop());autosave();render();
}
function fileName(ch,ext){return (ch?ch.name:"gacha-v4").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9_-]+/gi,"-").slice(0,40)+"."+ext;}
function download(blob,name){var url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(function(){URL.revokeObjectURL(url);},2000);}
async function saveJSON(){
 var txt=JSON.stringify(s.project,null,2);
 if(window.desktopAPI)await window.desktopAPI.saveText("gacha-corpo-v1.json",txt);
 else download(new Blob([txt],{type:"application/json"}),"gacha-corpo-v1.json");
 tell("JSON exportado.");
}
async function savePNG(){
 if(!current())return;
 var markup=C.renderSVG(current(),{}),url=URL.createObjectURL(new Blob([markup],{type:"image/svg+xml"}));
 try{
  var img=new Image();await new Promise(function(resolve,reject){img.onload=resolve;img.onerror=reject;img.src=url;});
  var canvas=document.createElement("canvas");canvas.width=C.WIDTH;canvas.height=C.HEIGHT;canvas.getContext("2d").drawImage(img,0,0);
  if(window.desktopAPI)await window.desktopAPI.saveImage(fileName(current(),"png"),canvas.toDataURL("image/png"));
  else await new Promise(function(resolve){canvas.toBlob(function(blob){download(blob,fileName(current(),"png"));resolve();},"image/png");});
  tell("PNG transparente exportado.");
 }finally{URL.revokeObjectURL(url);}
}
async function loadJSON(){
 try{
  var txt;if(window.desktopAPI)txt=await window.desktopAPI.openText();
  else txt=await new Promise(function(resolve){var input=document.createElement("input");input.type="file";input.accept=".json";input.onchange=function(){var file=input.files[0];if(file)file.text().then(resolve);else resolve(null);};input.click();});
  if(!txt)return;var next=C.normalize(JSON.parse(txt)),prev=serialize();s.project=next;history(prev);s.slot=Math.max(0,next.slots.findIndex(Boolean));s.part="head";render();tell("Projeto importado.");
 }catch(e){tell("Erro ao importar: "+e.message);}
}
async function action(e){
 var b=e.target.closest("[data-action],[data-slot],[data-part-select],[data-tool],[data-tab]");if(!b)return;
 if(b.hasAttribute("data-slot")){slot(Number(b.dataset.slot));return;}
 if(b.hasAttribute("data-part-select")){s.part=b.dataset.partSelect;render();return;}
 if(b.hasAttribute("data-tool")){s.tool=b.dataset.tool;render();return;}
 if(b.hasAttribute("data-tab")){s.tab=b.dataset.tab;render();return;}
 var k=b.dataset.action;
 if(k==="undo"||k==="redo")restore(k);
 else if(k==="new"){var i=s.project.slots.findIndex(function(x){return !x;});if(i<0)tell("Os 16 slots estão ocupados.");else slot(i);}
 else if(k==="clone"){if(!current())return;var i=s.project.slots.findIndex(function(x){return !x;});if(i<0)return tell("Sem slots livres.");var prev=serialize();s.project.slots[i]=JSON.parse(JSON.stringify(current()));s.project.slots[i].id="person-"+Date.now();s.project.slots[i].name+=" (cópia)";s.slot=i;history(prev);render();tell("Personagem duplicado.");}
 else if(k==="delete"){if(!current()||!confirm("Excluir o personagem deste slot?"))return;var prev=serialize();s.project.slots[s.slot]=null;history(prev);render();tell("Slot esvaziado.");}
 else if(k==="reset-part")edit(function(ch){var p=C.BY_ID[s.part];ch.pose[s.part]={x:p.base[0],y:p.base[1],rotation:0};});
 else if(k==="reset-pose")edit(function(ch){ch.pose=C.freshPose();});
 else if(k==="mirror")edit(function(ch){ch.mirrored=!ch.mirrored;});
 else if(k.startsWith("preset:"))edit(function(ch){C.applyPreset(ch,k.slice(7));});
 else if(k==="export-json")await saveJSON();
 else if(k==="export-png")await savePNG();
 else if(k==="import-json")await loadJSON();
}
function bind(){
 document.addEventListener("click",function(e){Promise.resolve(action(e)).catch(function(err){tell("Erro: "+err.message);});});
 $("character-name").addEventListener("change",function(e){edit(function(ch){ch.name=e.target.value.trim().slice(0,60)||ch.name;});});
 $("skin-color").addEventListener("change",function(e){edit(function(ch){ch.skin=e.target.value;});});
 document.addEventListener("change",function(e){var f=e.target.dataset.poseField;if(!f||!current())return;var n=Number(e.target.value);if(!Number.isFinite(n))return;edit(function(ch){ch.pose[s.part][f]=C.clamp(n,f==="rotation"?-180:-600,f==="rotation"?180:600);});});
 var startRange=null;
 document.addEventListener("pointerdown",function(e){if(e.target.id==="rotation-slider")startRange=serialize();});
 document.addEventListener("input",function(e){if(e.target.id!=="rotation-slider"||!current())return;current().pose[s.part].rotation=Number(e.target.value);$("rotation-value").textContent=e.target.value+"°";draw();});
 document.addEventListener("change",function(e){if(e.target.id!=="rotation-slider")return;history(startRange||serialize());startRange=null;render();});
 ["joint","grid","snap"].forEach(function(name){$(name+"-toggle").addEventListener("change",function(e){s[name==="joint"?"joints":name]=e.target.checked;draw();});});
 $("zoom-range").addEventListener("input",function(e){s.zoom=Number(e.target.value);$("zoom-label").textContent=s.zoom+"%";$("editor-stage").style.setProperty("--stage-zoom",s.zoom/100);});
 document.addEventListener("keydown",function(e){if(e.target.closest("input,textarea"))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){e.preventDefault();restore(e.shiftKey?"redo":"undo");}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="y"){e.preventDefault();restore("redo");}else if(e.key==="r"||e.key==="v"){s.tool=e.key==="r"?"rotate":"move";render();}});
}
async function init(){
 var raw=null;if(window.desktopAPI)try{raw=await window.desktopAPI.loadAutosave();}catch(e){}
 if(!raw)try{raw=localStorage.getItem("gacha-v4-body-project");}catch(e){}
 if(raw)try{s.project=C.normalize(JSON.parse(raw));}catch(e){console.warn(e);}
 bind();render();
}
window.GachaEditor={state:s,current:current,draw:draw,render:render,serialize:serialize,history:history};
document.addEventListener("DOMContentLoaded",init);
})();