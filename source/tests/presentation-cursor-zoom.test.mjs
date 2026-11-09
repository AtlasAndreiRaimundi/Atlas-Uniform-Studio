import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=name=>readFileSync(new URL(name,import.meta.url),'utf8');

test('o visualizador 3D aproxima em direção ao ponteiro do cliente',()=>{
 const app=file('../public/app.js');
 const orbit=file('../public/vendor/three/examples/jsm/controls/OrbitControls.js');
 const viewer=file('../public/viewer.html');
 assert.match(app,/new OrbitControls\(camera, renderer\.domElement\)/);
 assert.match(app,/controls\.zoomToCursor\s*=\s*true/);
 assert.match(orbit,/this\._updateZoomParameters\( event\.clientX, event\.clientY \)/);
 assert.match(orbit,/this\.object\.position\.addScaledVector\( this\._dollyDirection, radiusDelta \)/);
 assert.match(viewer,/app\.js\?v=zoom-cursor-20261109/);
});

test('a proposta informa o uso do zoom contextual sem alterar comentários e aprovações',()=>{
 const html=file('../public/proposta.html');
 assert.match(html,/role sobre o detalhe para aproximar/);
 assert.match(html,/proposalViewerA/);
 assert.match(html,/commentForm/);
 assert.match(html,/approvalForm/);
});
