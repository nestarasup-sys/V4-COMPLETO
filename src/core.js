(function (root) {
  "use strict";
  var WIDTH = 1122, HEIGHT = 1402, SLOT_COUNT = 16, POSE_SLOT_COUNT = 12;
  var BODY_ART=root.GachaBodyArt||(typeof require==="function"?require("./body-art.js"):null);
  var PARTS = [
    {id:"torso", name:"Tronco", parent:null, pivot:[559,475], base:[0,0]},
    // Anchor coordinates share the author's PNG pixel space. Child base offsets
    // place each child anchor directly on its parent's anchor in the neutral pose.
    {id:"head", name:"Cabeça", parent:"torso", pivot:[559,318], base:[0,23], joint:{parent:[559,341],child:[559,318]}},
    {id:"armLU", name:"Braço superior E", parent:"torso", pivot:[335,332], base:[147,58], joint:{parent:[482,390],child:[335,332]}},
    {id:"armLL", name:"Antebraço E", parent:"armLU", pivot:[257,513], base:[34,-30], joint:{parent:[291,483],child:[257,513]}},
    {id:"armRU", name:"Braço superior D", parent:"torso", pivot:[791,332], base:[-147,58], joint:{parent:[644,390],child:[791,332]}},
    {id:"armRL", name:"Antebraço D", parent:"armRU", pivot:[875,513], base:[-34,-30], joint:{parent:[841,483],child:[875,513]}},
    {id:"legLU", name:"Coxa E", parent:"torso", pivot:[461,686], base:[27,-21], joint:{parent:[488,665],child:[461,686]}},
    {id:"legLL", name:"Canela E", parent:"legLU", pivot:[438,960], base:[5,-28], joint:{parent:[443,932],child:[438,960]}},
    {id:"legRU", name:"Coxa D", parent:"torso", pivot:[682,686], base:[-26,-21], joint:{parent:[656,665],child:[682,686]}},
    {id:"legRL", name:"Canela D", parent:"legRU", pivot:[700,960], base:[-5,-28], joint:{parent:[695,932],child:[700,960]}}
  ];
  // Rest placement for the original exploded sprite sheet: limbs overlap enough
  // to read as one body while keeping each cutout independently editable.
  var LEGACY_REST={head:[0,23],armLU:[135,58],armLL:[0,-8],armRU:[-135,58],armRL:[0,-8],legLU:[18,-15],legLL:[5,-22],legRU:[-17,-15],legRL:[-5,-22]};
  var BY_ID = Object.fromEntries(PARTS.map(function(p){ return [p.id,p]; }));
  var DRAW_ORDER=["legLL","legRL","legLU","legRU","armLU","armRU","armLL","armRL","torso","head"];
  var PRESETS = {
    neutra: { },
    aceno: {armRU:-55,armRL:-65,armLU:9,armLL:11,head:-8},
    corrida: {armLU:37,armLL:40,armRU:-38,armRL:-30,legLU:23,legLL:-27,legRU:-24,legRL:37,torso:6},
    sentada: {legLU:-68,legRU:66,legLL:80,legRL:-65,armLU:-14,armRU:14,head:8},
    danca: {armLU:-52,armLL:-27,armRU:46,armRL:25,legLU:15,legRU:-12,head:12,torso:-7}
  };
  function clamp(n,min,max){return Math.min(max,Math.max(min,n));}
  function sane(n,lo,hi,def){var v=Number(n);return Number.isFinite(v)?clamp(v,lo,hi):def;}
  function freshPose(){
    var pose={};PARTS.forEach(function(p){pose[p.id]={x:p.base[0],y:p.base[1],rotation:0};});return pose;
  }
  function normalizePose(input){
    var pose=freshPose();input=input&&typeof input==="object"?input:{};
    PARTS.forEach(function(part){
      var value=input[part.id]&&typeof input[part.id]==="object"?input[part.id]:{};
      pose[part.id]={x:sane(value.x,-600,600,part.base[0]),
        y:sane(value.y,-600,600,part.base[1]),rotation:sane(value.rotation,-180,180,0)};
    });
    return pose;
  }
  function copyPose(pose){return JSON.parse(JSON.stringify(pose));}
  function isLegacyRest(pose){
    return !!pose&&PARTS.every(function(part){var value=pose[part.id]||{},base=LEGACY_REST[part.id]||[0,0];
      return Number(value.x||0)===base[0]&&Number(value.y||0)===base[1]&&Number(value.rotation||0)===0;});
  }
  function newPoseEntry(name,pose){return {id:"pose-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),name:String(name).slice(0,50),pose:copyPose(pose)};}
  function makeCharacter(index,initialPose){
    var pose=initialPose?normalizePose(initialPose.pose):freshPose();
    return {id:"person-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),
      name:"Personagem "+String(index+1).padStart(2,"0"),skin:"#f9eadd",
      pose:copyPose(pose), workingPose:copyPose(pose), savedPoses:[], mirrored:false,
      layerOrder:DRAW_ORDER.slice(),hiddenParts:[]};
  }
  function freshProject(){
    var slots=Array(SLOT_COUNT).fill(null);slots[0]=makeCharacter(0);
    return {format:"gacha-body-v1",version:1,poseSlots:Array(POSE_SLOT_COUNT).fill(null),slots:slots};
  }
  function safeCharacter(obj,index){
    if(!obj||typeof obj!=="object")return null;
    var p=freshPose(), input=obj.pose&&typeof obj.pose==="object"?obj.pose:{};
    PARTS.forEach(function(piece){
      var q=input[piece.id]||{};
      p[piece.id]={x:sane(q.x,-600,600,p[piece.id].x),y:sane(q.y,-600,600,p[piece.id].y),rotation:sane(q.rotation,-180,180,0)};
    });
    if(isLegacyRest(input))p=freshPose();
    var work={pose:input};
    if(obj.workingPose && typeof obj.workingPose==="object") work.pose=obj.workingPose;
    var w=freshPose();PARTS.forEach(function(piece){var q=work.pose[piece.id]||{};w[piece.id]={x:sane(q.x,-600,600,p[piece.id].x),y:sane(q.y,-600,600,p[piece.id].y),rotation:sane(q.rotation,-180,180,p[piece.id].rotation)};});
    if(isLegacyRest(work.pose))w=freshPose();
    var entries=Array.isArray(obj.savedPoses)?obj.savedPoses.slice(0,40):[];
    var savedPoses=entries.filter(function(v){return v&&typeof v==="object"&&v.pose;}).map(function(v,i){
      var po=freshPose();PARTS.forEach(function(part){var q=v.pose[part.id]||{};po[part.id]={x:sane(q.x,-600,600,part.base[0]),y:sane(q.y,-600,600,part.base[1]),rotation:sane(q.rotation,-180,180,0)};});
      return {id:String(v.id||("saved-"+i)).slice(0,80),name:String(v.name||("Pose "+(i+1))).slice(0,50),pose:po};
    });
    var color=typeof obj.skin==="string"&&/^#[0-9a-f]{6}$/i.test(obj.skin)?obj.skin:"#f9eadd";
    var layerOrder=[],seenLayers={};
    (Array.isArray(obj.layerOrder)?obj.layerOrder:[]).forEach(function(id){if(BY_ID[id]&&!seenLayers[id]){seenLayers[id]=true;layerOrder.push(id);}});
    DRAW_ORDER.forEach(function(id){if(!seenLayers[id]){seenLayers[id]=true;layerOrder.push(id);}});
    var hiddenParts=Array.isArray(obj.hiddenParts)?Array.from(new Set(obj.hiddenParts.filter(function(id){return !!BY_ID[id];}))):[];
    return {id:String(obj.id||("slot-"+index)).slice(0,100),
      name:String(obj.name||("Personagem "+(index+1))).slice(0,60),
      skin:color,pose:p,workingPose:w,savedPoses:savedPoses,mirrored:!!obj.mirrored,
      layerOrder:layerOrder,hiddenParts:hiddenParts};
  }
  function normalize(raw){
    if(!raw||raw.format!=="gacha-body-v1"||raw.version!==1||!Array.isArray(raw.slots)||raw.slots.length!==SLOT_COUNT)
      throw new Error("Formato inválido. Esperado gacha-body-v1 com 16 slots.");
    var slots=raw.slots.map(safeCharacter);
    var poseSlots=Array(POSE_SLOT_COUNT).fill(null);
    if(Array.isArray(raw.poseSlots))raw.poseSlots.slice(0,POSE_SLOT_COUNT).forEach(function(entry,index){
      if(entry&&typeof entry==="object"&&entry.pose)poseSlots[index]={id:String(entry.id||("pose-slot-"+index)).slice(0,80),
        name:String(entry.name||("Pose "+(index+1))).slice(0,50),pose:normalizePose(entry.pose)};
    });
    slots.forEach(function(character){if(character)character.savedPoses.forEach(function(entry){
      if(poseSlots.some(function(slot){return slot&&slot.id===entry.id;}))return;
      var empty=poseSlots.findIndex(function(slot){return slot===null;});
      if(empty>=0)poseSlots[empty]={id:entry.id,name:entry.name,pose:copyPose(entry.pose)};
    });});
    return {format:"gacha-body-v1",version:1,poseSlots:poseSlots,slots:slots};
  }
  function rotation(a){var c=Math.cos(a*Math.PI/180),s=Math.sin(a*Math.PI/180);return [c,s,-s,c,0,0];}
  function mul(m,n){return [m[0]*n[0]+m[2]*n[1],m[1]*n[0]+m[3]*n[1],
    m[0]*n[2]+m[2]*n[3],m[1]*n[2]+m[3]*n[3],
    m[0]*n[4]+m[2]*n[5]+m[4],m[1]*n[4]+m[3]*n[5]+m[5]];}
  function tr(x,y){return [1,0,0,1,x,y];}
  function point(m,p){return [m[0]*p[0]+m[2]*p[1]+m[4],m[1]*p[0]+m[3]*p[1]+m[5]];}
  var I=[1,0,0,1,0,0];
  function transforms(character){
    var pose=character.pose,memo={};
    function resolve(id){
      if(memo[id])return memo[id];
      var p=BY_ID[id],v=pose[id]||{},x=v.x||0,y=v.y||0,r=v.rotation||0;
      var own=mul(tr(x+p.pivot[0],y+p.pivot[1]),mul(rotation(r),tr(-p.pivot[0],-p.pivot[1])));
      memo[id]=mul(p.parent?resolve(p.parent):I,own);return memo[id];
    }
    PARTS.forEach(function(p){resolve(p.id);});return memo;
  }
  function jointPositions(character){
    var matrices=transforms(character),result={};
    PARTS.forEach(function(piece){if(piece.joint)result[piece.id]={
      parent:point(matrices[piece.parent],piece.joint.parent),
      child:point(matrices[piece.id],piece.joint.child)
    };});
    return result;
  }
  function esc(value){return String(value).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
  function hexChannel(color,index){return parseInt(color.slice(index,index+2),16)/255;}
  function renderSVG(character,options){
    options=options||{};
    if(!character)return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1122 1995"></svg>';
    var preview=!!options.preview,editor=!!options.editor;
    var h=preview?1616:HEIGHT,yShift=preview?115:0;
    var m=transforms(character);
    var rootTransform=(character.mirrored?"translate(1122 0) scale(-1 1) ":"")+"translate(0 "+yShift+")";
    var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+(preview?'107 0 909 1616':'0 0 '+WIDTH+' '+h)+'" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Corpo chibi articulado">';
    var skin=typeof character.skin==="string"&&/^#[0-9a-f]{6}$/i.test(character.skin)?character.skin:"#f9eadd";
    svg+='<defs><filter id="skinTint" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="'+hexChannel(skin,1)+' 0 0 0 0 '+hexChannel(skin,3)+' 0 0 0 0 '+hexChannel(skin,5)+' 0 0 0 0 0 0 0 1 0"/></filter></defs>';
    if(editor&&options.grid){
      svg+='<defs><pattern id="grid" width="56" height="56" patternUnits="userSpaceOnUse"><path d="M56 0H0V56" fill="none" stroke="#bcb5d8" stroke-opacity=".24" stroke-width="2"/></pattern></defs><rect width="1122" height="1402" fill="url(#grid)"/>';
    }
    svg+='<g transform="'+rootTransform+'">';
    var order=Array.isArray(character.layerOrder)?character.layerOrder:DRAW_ORDER;
    var hidden=Array.isArray(character.hiddenParts)?character.hiddenParts:[];
    order.forEach(function(id){
      if(!BY_ID[id]||hidden.indexOf(id)>=0)return;
      var matrix=m[id].map(function(v){return +v.toFixed(5);}).join(" "),art=BODY_ART&&BODY_ART[id];
      if(!art)return;
      svg+='<g data-part="'+id+'" transform="matrix('+matrix+')"><image data-part="'+id+'" href="'+art.image+'" x="'+art.x+'" y="'+art.y+'" width="'+art.width+'" height="'+art.height+'" preserveAspectRatio="none"/><image href="'+art.shade+'" x="'+art.x+'" y="'+art.y+'" width="'+art.width+'" height="'+art.height+'" preserveAspectRatio="none" filter="url(#skinTint)" pointer-events="none"/></g>';
    });
    if(editor&&options.joints){
      PARTS.forEach(function(p){
        if(hidden.indexOf(p.id)>=0)return;
        var pos=point(m[p.id],p.joint?p.joint.child:p.pivot);
        svg+='<g data-part="'+p.id+'" class="rig-joint"><circle data-part="'+p.id+'" cx="'+pos[0]+'" cy="'+pos[1]+'" r="'+(p.id===options.selected?17:12)+'" fill="'+(p.id===options.selected?"#ffcf7b":"#bcafff")+'" stroke="#362c59" stroke-width="5"/><circle cx="'+pos[0]+'" cy="'+pos[1]+'" r="3.8" fill="#272040" pointer-events="none"/></g>';
      });
    }
    svg+='</g></svg>';return svg;
  }
  function applyPreset(character,name){
    var preset=PRESETS[name];if(!preset)return false;
    PARTS.forEach(function(p){character.pose[p.id].rotation=preset[p.id]||0;});return true;
  }
  var api={WIDTH:WIDTH,HEIGHT:HEIGHT,SLOT_COUNT:SLOT_COUNT,POSE_SLOT_COUNT:POSE_SLOT_COUNT,PARTS:PARTS,BY_ID:BY_ID,PRESETS:PRESETS,
    DRAW_ORDER:DRAW_ORDER,ART:BODY_ART,makeCharacter:makeCharacter,freshProject:freshProject,
    freshPose:freshPose,copyPose:copyPose,newPoseEntry:newPoseEntry,normalizePose:normalizePose,normalize:normalize,renderSVG:renderSVG,applyPreset:applyPreset,
    transforms:transforms,jointPositions:jointPositions,point:point,mul:mul,rotation:rotation,tr:tr,esc:esc,clamp:clamp};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  root.GachaCore=api;
})(typeof window!=="undefined"?window:globalThis);
