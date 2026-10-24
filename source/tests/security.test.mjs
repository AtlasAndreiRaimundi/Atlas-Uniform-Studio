import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertMutation,boundedJSON,boundedForm} from '../lib/request-security.mjs';
import {secureResponse} from '../lib/security-headers.mjs';
import {productionInput} from '../lib/production-service.mjs';
import {listInput} from '../lib/list-service.mjs';

const url='https://studio.example/api/projects';
const json=(body,headers={})=>new Request(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body});

test('mutations reject a different origin and cross-site browser requests while accepting same-origin requests',()=>{
  assert.throws(()=>assertMutation(json('{}',{Origin:'https://other.example'})),{status:403});
  assert.throws(()=>assertMutation(json('{}',{'Sec-Fetch-Site':'cross-site'})),{status:403});
  assert.doesNotThrow(()=>assertMutation(json('{}',{Origin:'https://studio.example','Sec-Fetch-Site':'same-origin'})));
  assert.doesNotThrow(()=>assertMutation(json('{}')));
});

test('JSON limits count UTF-8 bytes without trusting Content-Length and reject non-object or malformed data',async()=>{
  await assert.rejects(boundedJSON(json('{"name":"éé"}',{'Content-Length':'2'}),{maxBytes:14}),{status:413});
  assert.deepEqual(await boundedJSON(json('{"name":"éé"}'),{maxBytes:15}),{name:'éé'});
  for(const body of ['null','[]','"name"','{'])await assert.rejects(boundedJSON(json(body)),{status:400});
  await assert.rejects(boundedJSON(new Request(url,{method:'POST',body:'{}'})),{status:415});
});

test('oversized streaming input cancels before reading the remaining upload',async()=>{
  let cancelled=false,reads=0;
  const body=new ReadableStream({pull(controller){reads++;controller.enqueue(new Uint8Array(8));},cancel(){cancelled=true;}});
  const request=new Request(url,{method:'POST',body,duplex:'half',headers:{'Content-Type':'application/json'}});
  await assert.rejects(boundedJSON(request,{maxBytes:9}),{status:413});
  assert.equal(cancelled,true);assert.ok(reads<5);
});

test('multipart uploads use the actual body budget and retain legitimate file contents',async()=>{
  const form=new FormData();form.set('metadata','{"name":"Equipe"}');form.set('map',new File(['artwork'],'design.png',{type:'image/png'}));
  const good=new Request(url,{method:'POST',body:form}),bad=good.clone();bad.headers.set('Content-Length','1');
  await assert.rejects(boundedForm(bad,{maxBytes:64}),{status:413});
  const parsed=await boundedForm(good,{maxBytes:4096});assert.equal(parsed.get('metadata'),'{"name":"Equipe"}');assert.equal(await parsed.get('map').text(),'artwork');
  const fields=new FormData();for(let i=0;i<17;i++)fields.set('field'+i,'value');
  await assert.rejects(boundedForm(new Request(url,{method:'POST',body:fields})),{status:413});
  const large=new FormData();large.set('metadata','é'.repeat(32769));
  await assert.rejects(boundedForm(new Request(url,{method:'POST',body:large})),{status:413});
  await assert.rejects(boundedForm(json('{}')),{status:415});
});

test('order and list parsers preserve their separate limits for uploads without a length header',async()=>{
  for(const [parse,max] of [[productionInput,16*1024*1024],[listInput,10*1024*1024]]){
    assert.deepEqual(await parse(json('{"document":{"schema":1}}')),{document:{schema:1}});
    let sent=false,cancelled=false;
    const stream=new ReadableStream({pull(controller){if(!sent){sent=true;controller.enqueue(new Uint8Array(max+1));}else controller.close();},cancel(){cancelled=true;}});
    await assert.rejects(parse(new Request(url,{method:'POST',duplex:'half',body:stream,headers:{'Content-Type':'application/json'}})),{status:413});
  }
});

test('page headers protect links and framing while keeping ChatGPT and studio frames available',async()=>{
  const response=secureResponse(new Request('https://studio.example/pedidos'),new Response('<p>Order</p>',{headers:{'Content-Type':'text/html','Set-Cookie':'session=abc; Secure; HttpOnly'}}));
  assert.equal(await response.text(),'<p>Order</p>');assert.equal(response.headers.get('Set-Cookie'),'session=abc; Secure; HttpOnly');
  assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');assert.equal(response.headers.get('Cache-Control'),'private, no-store');
  assert.match(response.headers.get('Content-Security-Policy'),/frame-ancestors 'self' https:\/\/chatgpt.com https:\/\/\*\.chatgpt.com/);
  assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
  const policy="default-src 'none'; sandbox",asset=secureResponse(new Request(url),new Response('<svg/>',{headers:{'Content-Type':'image/svg+xml','Content-Security-Policy':policy,'Content-Disposition':'attachment'}}));
  assert.equal(asset.headers.get('Content-Security-Policy'),policy);assert.equal(asset.headers.get('Content-Disposition'),'attachment');assert.equal(asset.headers.get('Cache-Control'),null);
});
