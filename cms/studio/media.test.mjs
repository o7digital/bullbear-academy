import test from 'node:test';
import assert from 'node:assert/strict';
import {videoDetails,normalizeVideoInput,isUploadId} from './public/media.js';
import {validateRecord} from './content.mjs';
test('complete YouTube URLs, www addresses, share links and Shorts preserve existing video IDs',()=>{
 for(const url of ['https://www.youtube.com/watch?v=zT8i84q4kDk&t=15','www.youtube.com/watch?v=zT8i84q4kDk','https://youtu.be/zT8i84q4kDk?si=share','https://www.youtube.com/shorts/zT8i84q4kDk','https://www.youtube.com/live/zT8i84q4kDk','zT8i84q4kDk']){assert.equal(normalizeVideoInput(url),'zT8i84q4kDk');assert.equal(videoDetails(url).url,'https://www.youtube.com/watch?v=zT8i84q4kDk');}
});
test('Vimeo private-link hashes and direct MP4 signed query strings are retained',()=>{
 const vimeo=videoDetails('www.vimeo.com/123456789/abcdef');assert.equal(vimeo.type,'vimeo');assert.equal(vimeo.embed,'https://player.vimeo.com/video/123456789?h=abcdef');
 const file='https://media.example.com/c7978f50-bc32-4ab1-b8bb-94bdb505bd27.mp4?token=fixture';assert.equal(normalizeVideoInput(file),file);assert.equal(videoDetails(file).type,'file');assert.equal(isUploadId(file),false);
 assert.equal(videoDetails('https://www.example.com/watch/lesson').type,'link');
});
test('unsafe URLs and malformed provider links are rejected before publication',()=>{
 for(const value of ['javascript:alert(1)','data:text/html,abc','http://www.youtube.com/watch?v=zT8i84q4kDk','https://user:password@example.com/video.mp4','https://www.youtube.com/watch?v=invalid','https://vimeo.com/channels/staffpicks','../secret'])assert.throws(()=>videoDetails(value));
 assert.equal(videoDetails('https://www.youtube.com.evil.example/watch?v=zT8i84q4kDk').type,'link');
});
test('existing uploads stay editable, while a full pasted URL is accepted by the content API',()=>{
 const id='c7978f50-bc32-4ab1-b8bb-94bdb505bd27';assert.equal(isUploadId(id),true);assert.equal(normalizeVideoInput(id),id);assert.equal(videoDetails('/_cms/video.mp4').type,'file');
 const row=validateRecord({kind:'media',section:'videos',title:'Curso',body:'',video:'www.youtube.com/watch?v=zT8i84q4kDk',status:'draft',sort:0});assert.equal(row.video,'zT8i84q4kDk');
});
