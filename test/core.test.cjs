"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const core=require("../src/core.js");
test("16 character slots, first slot ready",()=>{
 const p=core.freshProject();assert.equal(p.slots.length,16);assert.ok(p.slots[0]);assert.equal(p.slots[1],null);
});
test("all ten body pieces with parent joints",()=>{
 const ch=core.makeCharacter(0);assert.equal(core.PARTS.length,10);assert.equal(Object.keys(ch.pose).length,10);
 const matrix=core.transforms(ch);assert.equal(Object.keys(matrix).length,10);
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
 assert.ok(core.PATHS.head.startsWith("M"));
});
test("JSON roundtrip and rejects incompatible formats",()=>{
 const p=core.freshProject();const output=core.normalize(JSON.parse(JSON.stringify(p)));
 assert.equal(output.slots[0].name,p.slots[0].name);
 assert.equal(output.version,2);assert.equal(output.poses.length,5);
 assert.throws(()=>core.normalize({format:"v3",slots:[]}));
});
test("version 1 projects migrate without losing characters and receive starter poses",()=>{
 const project=core.freshProject();project.slots[2]=core.makeCharacter(2);project.slots[2].pose.armRU.rotation=-37;
 const old={format:"gacha-body-v1",version:1,slots:project.slots};
 const migrated=core.normalize(old);
 assert.equal(migrated.version,2);assert.equal(migrated.slots[2].pose.armRU.rotation,-37);
 assert.deepEqual(migrated.poses.map(pose=>pose.name),["Neutra","Aceno","Corrida","Sentada","Dança"]);
});
test("custom pose snapshots are isolated, bounded, and safe to reimport",()=>{
 const character=core.makeCharacter(0);character.pose.head.rotation=23;
 const saved=core.createPoseSnapshot("Aceno pessoal",character);character.pose.head.rotation=90;
 assert.equal(saved.pose.head.rotation,23);
 const imported=core.normalizePoseLibrary({format:"gacha-pose-library-v1",version:1,poses:[saved]});
 core.applySavedPose(character,imported[0]);assert.equal(character.pose.head.rotation,23);
 assert.throws(()=>core.normalizePoseLibrary({format:"gacha-pose-library-v1",version:1,poses:Array(101).fill(saved)}));
});
test("rejects untrusted geometry values and escapes names",()=>{
 const p=core.freshProject();p.slots[0].pose.head.rotation=99999;p.slots[0].name='<script>alert(1)</script>';
 const clean=core.normalize(p);assert.equal(clean.slots[0].pose.head.rotation,180);
 assert.ok(!core.renderSVG(clean.slots[0],{editor:true,joints:true}).includes("<script>"));
});
test("renderer supports editor and 9:16 preview",()=>{
 const ch=core.makeCharacter(0);
 assert.ok(core.renderSVG(ch,{preview:true}).includes("1995"));
 assert.ok(core.renderSVG(ch,{editor:true,joints:true}).includes("rig-joint"));
 assert.ok(core.renderSVG(ch,{}).includes("viewBox"));
});
