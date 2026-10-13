"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const core=require("../src/core.js");
test("16 character slots, first slot ready",()=>{
 const p=core.freshProject();assert.equal(p.slots.length,16);assert.ok(p.slots[0]);assert.equal(p.slots[1],null);
});
test("12 shared pose slots survive normalization and seed new characters from slot one",()=>{
 const project=core.freshProject(),pose=core.freshPose();pose.head.x=42;pose.head.rotation=-12;
 const entry=core.newPoseEntry("Pose base",pose);project.poseSlots[0]=entry;
 const restored=core.normalize(JSON.parse(JSON.stringify(project)));
 assert.equal(restored.poseSlots.length,12);assert.equal(restored.poseSlots[0].name,"Pose base");
 assert.equal(restored.poseSlots[0].pose.head.x,42);
 const character=core.makeCharacter(3,restored.poseSlots[0]);
 assert.deepEqual(character.pose,restored.poseSlots[0].pose);
 assert.deepEqual(character.workingPose,restored.poseSlots[0].pose);
 const legacy={format:project.format,version:project.version,slots:project.slots};
 legacy.slots[0].savedPoses=[entry];
 assert.equal(core.normalize(legacy).poseSlots[0].name,"Pose base","projetos anteriores recuperam poses salvas para a grade compartilhada");
});
test("all ten body pieces with parent joints",()=>{
 const ch=core.makeCharacter(0);assert.equal(core.PARTS.length,10);assert.equal(Object.keys(ch.pose).length,10);
 const matrix=core.transforms(ch);assert.equal(Object.keys(matrix).length,10);
});
test("wardrobe catalog contains the original sheet assets and garments render only when worn",()=>{
 const character=core.makeCharacter(0);
 assert.equal(core.WARDROBE_ART.tops.length,8,"catálogo mostra as oito regatas da folha");
 assert.equal(core.WARDROBE_ART.sleeves.length,8,"catálogo mostra os oito pares de mangas");
 core.WARDROBE_ART.tops.concat(...core.WARDROBE_ART.sleeves).forEach(piece=>assert.match(piece.image,/^data:image\/png;base64,/));
 const svg=core.renderSVG(character);
 assert.equal(svg.includes("data-clothing"),false,"personagens sem escolha começam sem roupa equipada");
 character.wardrobe.top={index:2,x:13,y:-8,scale:120,rotation:5};
 character.wardrobe.sleeves={index:4,x:-3,y:6,scale:90,rotation:-2};
 const dressed=core.renderSVG(character);
 assert.equal((dressed.match(/data-clothing=/g)||[]).length,3,"a regata e as duas mangas acompanham o corpo articulado");
 assert.match(dressed,/data-clothing="top" data-item="2"/);
 assert.match(dressed,/data-clothing="sleeve-left" data-item="4"/);
 assert.match(dressed,/data-clothing="sleeve-right" data-item="4"/);
 const normalized=core.normalize({format:"gacha-body-v1",version:1,slots:[character,...Array(15).fill(null)]}).slots[0];
 assert.deepEqual(normalized.wardrobe,character.wardrobe,"transformações de roupa persistem na normalização do projeto");
 normalized.wardrobe.top=null;assert.equal(normalized.wardrobe.sleeves.index,4,"remover uma categoria não apaga a outra");
});

test("slot three pose and layer stack become the persistent default for new characters",()=>{
 const project=core.freshProject(),source=core.makeCharacter(2),pose=core.freshPose();
 pose.head.rotation=-6;pose.armLU.rotation=23;pose.armLL.rotation=-126;pose.armRU.rotation=-30;pose.armRL.rotation=127;pose.legRU.rotation=-74;
 source.pose=core.copyPose(pose);source.workingPose=core.copyPose(pose);
 source.layerOrder=["head","torso","armLL","armRL","armLU","armRU","legLL","legRL","legLU","legRU"];
 source.hiddenParts=["armRU"];
 project.slots[2]=source;
 const restored=core.normalize(JSON.parse(JSON.stringify(project)));
 assert.equal(restored.defaultPose.sourceSlot,2);
 assert.deepEqual(restored.defaultPose.pose,pose,"migração adota a pose aplicada ao personagem do slot 3");
 assert.deepEqual(restored.defaultPose.layerOrder,source.layerOrder);
 assert.deepEqual(restored.defaultPose.hiddenParts,["armRU"]);
 assert.equal(restored.slots[2].savedPoses[0].name,"Pose padrão","projeto antigo ganha uma pose editável correspondente ao padrão");
 assert.equal(restored.poseSlots[0].id,restored.defaultPose.id,"pose padrão também fica acessível na biblioteca rápida");
 const created=core.makeCharacter(7,core.defaultPoseFor(restored));
 assert.deepEqual(created.pose,restored.slots[2].pose);
 assert.deepEqual(created.layerOrder,restored.slots[2].layerOrder,"personagem novo herda a ordem customizada");
 assert.deepEqual(created.hiddenParts,["armRU"],"personagem novo herda a visibilidade de cada camada");
 const roundtrip=core.normalize(JSON.parse(JSON.stringify(restored)));
 assert.deepEqual(core.defaultPoseFor(roundtrip),restored.defaultPose,"padrão permanece estável ao reabrir o projeto");
});

test("saved poses preserve custom layer order and visibility across import-compatible projects",()=>{
 const project=core.freshProject(),ch=project.slots[0];ch.layerOrder=["head","torso","armLU"];
 ch.hiddenParts=["armRU","legLU"];
 const entry=core.newPoseEntry("Camadas",ch.workingPose,ch);ch.savedPoses.push(entry);project.poseSlots[0]=entry;
 const restored=core.normalize(JSON.parse(JSON.stringify(project)));
 assert.deepEqual(restored.poseSlots[0].layerOrder,ch.layerOrder.concat(core.DRAW_ORDER.filter(id=>!ch.layerOrder.includes(id))));
 assert.deepEqual(restored.poseSlots[0].hiddenParts,["armRU","legLU"]);
 assert.deepEqual(restored.slots[0].savedPoses[0].hiddenParts,["armRU","legLU"]);
});
test("neutral sprite assembly closes limb gaps and migrates untouched old defaults",()=>{
 const neutral=core.freshPose();
 assert.deepEqual(neutral.armLL,{x:34,y:-30,rotation:0},"antebraço sobrepõe o braço superior pelo recorte real do PNG");
 assert.deepEqual(neutral.legLU,{x:27,y:-21,rotation:0},"coxas se aproximam e sobrepõem mais o tronco");
 assert.deepEqual(neutral.legLL,{x:5,y:-28,rotation:0},"canela sobrepõe a coxa no joelho");
 const joints=core.jointPositions(core.makeCharacter(0));
 for(const [id,value] of Object.entries(joints))assert.ok(Math.hypot(value.parent[0]-value.child[0],value.parent[1]-value.child[1])<1e-6,`${id} mantém a junta alinhada`);
 const legacy=core.freshProject(),old=legacy.slots[0];
 old.pose=core.copyPose(old.pose);old.workingPose=core.copyPose(old.workingPose);
 for(const part of core.PARTS){const base={torso:[0,0],head:[0,23],armLU:[135,58],armLL:[0,-8],armRU:[-135,58],armRL:[0,-8],legLU:[18,-15],legLL:[5,-22],legRU:[-17,-15],legRL:[-5,-22]}[part.id];
  old.pose[part.id]={x:base[0],y:base[1],rotation:0};old.workingPose[part.id]={x:base[0],y:base[1],rotation:0};}
 const migrated=core.normalize(legacy).slots[0];
 assert.deepEqual(migrated.pose,neutral,"pose neutra antiga atualiza para a montagem anatômica nova");
 assert.deepEqual(migrated.workingPose,neutral,"rascunho neutro antigo também é atualizado");
 old.pose.head.rotation=14;assert.equal(core.normalize(legacy).slots[0].pose.head.rotation,14,"poses que o usuário realmente alterou são preservadas");
});
test("layer order and visibility are normalized and control body rendering",()=>{
 const project=core.freshProject(),character=project.slots[0];
 character.layerOrder=["head","torso","head","unknown"];
 character.hiddenParts=["head","unknown","head"];
 const restored=core.normalize(project).slots[0];
 assert.equal(restored.layerOrder.length,10);assert.equal(new Set(restored.layerOrder).size,10);
 assert.equal(restored.layerOrder[0],"head");assert.deepEqual(restored.hiddenParts,["head"]);
 const svg=core.renderSVG(restored,{editor:true,joints:true});
 assert.equal(svg.includes('<g data-part="head" transform'),false,"camada oculta não desenha cabeça nem alça de junta");
 assert.ok(svg.indexOf('<g data-part="torso" transform')<svg.indexOf('<g data-part="armLU" transform'),"ordem customizada controla a sequência de desenho");
});
test("hierarchical joint anchors stay connected through parent and child rotation",()=>{
 const ch=core.makeCharacter(0);
 for(const preset of Object.keys(core.PRESETS)){
  core.applyPreset(ch,preset);
  const joints=core.jointPositions(ch);
  for(const part of core.PARTS.filter(piece=>piece.joint)){
   const {parent,child}=joints[part.id];
   assert.ok(Math.hypot(parent[0]-child[0],parent[1]-child[1])<1e-6,
    `${part.name}: pivô filho deve coincidir com a junta do pai no preset ${preset}`);
  }
 }
});
test("poses change rig without changing shape data",()=>{
 const ch=core.makeCharacter(0);const before=core.transforms(ch).armRU.join(",");
 core.applyPreset(ch,"aceno");assert.notEqual(core.transforms(ch).armRU.join(","),before);
 assert.equal(Object.keys(core.ART).length,10,"cada parte usa um recorte do PNG original");
 assert.ok(core.ART.head.image.startsWith("data:image/png;base64,"));
 assert.ok(core.ART.head.shade.startsWith("data:image/png;base64,"));
 const tinted={...ch,skin:"#123456"},svg=core.renderSVG(tinted);
 assert.ok(svg.includes("0.07058823529411765 0 0 0 0 0.20392156862745098"),"máscara de pele deve adotar a cor escolhida sem redesenhar a arte");
 assert.ok(svg.includes("<image data-part=\"head\""),"a renderização usa o PNG original, não o contorno vetorial refeito");
});
test("JSON roundtrip and rejects incompatible formats",()=>{
 const p=core.freshProject();const output=core.normalize(JSON.parse(JSON.stringify(p)));
 assert.equal(output.slots[0].name,p.slots[0].name);
 assert.equal(output.version,1);assert.equal(output.slots.length,16);
 assert.throws(()=>core.normalize({format:"v3",slots:[]}));
});
test("version 1 project normalization preserves characters and draft pose data",()=>{
 const project=core.freshProject();project.slots[2]=core.makeCharacter(2);project.slots[2].pose.armRU.rotation=-37;
 const old={format:"gacha-body-v1",version:1,slots:project.slots};
 const migrated=core.normalize(old);
 assert.equal(migrated.version,1);assert.equal(migrated.slots[2].pose.armRU.rotation,-37);
 assert.deepEqual(migrated.slots[2].workingPose,project.slots[2].workingPose);
});
test("rejects untrusted geometry values and escapes names",()=>{
 const p=core.freshProject();p.slots[0].pose.head.rotation=99999;p.slots[0].name='<script>alert(1)</script>';
 const clean=core.normalize(p);assert.equal(clean.slots[0].pose.head.rotation,180);
 assert.ok(!core.renderSVG(clean.slots[0],{editor:true,joints:true}).includes("<script>"));
});
test("renderer supports editor and 9:16 preview",()=>{
 const ch=core.makeCharacter(0);
 assert.ok(core.renderSVG(ch,{preview:true}).includes("107 0 909 1616"));
 assert.ok(core.renderSVG(ch,{editor:true,joints:true}).includes("rig-joint"));
 assert.ok(core.renderSVG(ch,{}).includes("viewBox"));
});


test("edits to working pose do not change the published pose",()=>{
 const ch=core.makeCharacter(0);
 ch.workingPose.armLU.x=99;
 assert.notEqual(ch.workingPose.armLU.x,ch.pose.armLU.x);
 const restored=core.normalize({format:"gacha-body-v1",version:1,slots:[ch,...Array(15).fill(null)]});
 assert.equal(restored.slots[0].workingPose.armLU.x,99);
 assert.equal(restored.slots[0].pose.armLU.x,ch.pose.armLU.x);
});
test("old character projects migrate to independent working pose",()=>{
 const project=core.freshProject();
 delete project.slots[0].workingPose;delete project.slots[0].savedPoses;
 const migrated=core.normalize(project).slots[0];
 assert.deepEqual(migrated.workingPose,migrated.pose);
 assert.deepEqual(migrated.savedPoses,[]);
});
test("pose presets save, reload and apply explicitly",()=>{
 const ch=core.makeCharacter(0);
 core.applyPreset({pose:ch.workingPose},"aceno");
 const saved=core.newPoseEntry("Meu aceno",ch.workingPose);
 ch.savedPoses.push(saved);
 assert.equal(ch.pose.armRU.rotation,0);
 ch.pose=core.copyPose(saved.pose);
 assert.equal(ch.pose.armRU.rotation,-55);
});
test("saved poses are independent copies and imported geometry is bounded",()=>{
 const ch=core.makeCharacter(0);ch.workingPose.head.rotation=23;
 const entry=core.newPoseEntry("Teste",ch.workingPose);ch.workingPose.head.rotation=70;
 assert.equal(entry.pose.head.rotation,23);
 assert.equal(core.normalizePose({head:{x:9999,rotation:-250}}).head.x,600);
 assert.equal(core.normalizePose({head:{x:9999,rotation:-250}}).head.rotation,-180);
});
