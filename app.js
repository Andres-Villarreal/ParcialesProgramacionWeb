
/*
  app.js
*/
(function(){
  const raw = window.__EXCEL_DATA__;
  const rows = raw.rows || [];
  const coefs = rows.map(r => r.coef);
  const xs = rows.map(r => r.x);
  const y_matrix = rows.map(r => r.y);
  const factorInput = document.getElementById('factor');
  const applyBtn = document.getElementById('applyBtn');

  function normalize(arr){
    const vals = arr.filter(v => v!=null);
    if(vals.length===0) return arr.map(()=>null);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    if (min === max) return arr.map(v => v==null ? null : 0.5);
    return arr.map(v => v==null ? null : (v - min) / (max - min));
  }
  function sumYs(yrow){ return yrow.reduce((a,b) => a + (b==null?0:b), 0); }
  function buildTable(title, headers, rows){
    const card = document.createElement('div');
    card.className = 'table-card';
    const h = document.createElement('h3'); h.textContent = title; card.appendChild(h);
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const thr = document.createElement('tr');
    headers.forEach(hd => { const th = document.createElement('th'); th.textContent=hd; thr.appendChild(th); });
    thead.appendChild(thr);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    rows.forEach(r => {
      const tr = document.createElement('tr');
      r.forEach((cell, idx) => {
        const td = document.createElement('td');
        td.textContent = (cell===null || cell===undefined) ? '' : (typeof cell === 'number' ? Number.isInteger(cell) ? cell : cell.toFixed(6) : cell);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    card.appendChild(table);
    return card;
  }
  function drawLineChart(canvasId, labels, seriesList){
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.clientWidth;
    canvas.height = 240;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const allVals = seriesList.flatMap(s => s.data.filter(v => v!=null));
    if(allVals.length===0) return;
    const min = Math.min(...allVals);
    const max = Math.max(...allVals);
    const pad = (max - min) * 0.1 || 1;
    const vmin = min - pad;
    const vmax = max + pad;
    ctx.strokeStyle = '#cccccc';
    ctx.beginPath();
    ctx.moveTo(40,10);
    ctx.lineTo(40,canvas.height-30);
    ctx.lineTo(canvas.width-10, canvas.height-30);
    ctx.stroke();
    const n = labels.length;
    labels.forEach((lab,i) => {
      const x = 40 + ( (canvas.width-60) * (i/(n-1 || 1)) );
      ctx.fillStyle='#666';
      ctx.font='10px sans-serif';
      ctx.fillText(String(lab), x-6, canvas.height-10);
    });
    const colors = ['#2b6cb0','#dd6b20','#48bb78','#9f7aea','#ed64a6','#f6ad55','#4299e1'];
    seriesList.forEach((s,si) => {
      ctx.strokeStyle = colors[si % colors.length];
      ctx.lineWidth = 2;
      ctx.beginPath();
      s.data.forEach((v,i) => {
        if (v==null) return;
        const x = 40 + ( (canvas.width-60) * (i/(n-1 || 1)) );
        const y = 10 + ( (canvas.height-40) * (1 - (v - vmin) / (vmax - vmin)) );
        if (i===0 || s.data.slice(0,i).every(val => val==null)) ctx.moveTo(x,y);
        else ctx.lineTo(x,y);
      });
      ctx.stroke();
      ctx.fillStyle=ctx.strokeStyle;
      ctx.fillRect(canvas.width - 110, 14 + si*16, 10, 8);
      ctx.fillStyle='#222';
      ctx.fillText(s.name, canvas.width - 94, 20 + si*16);
    });
  }

  function computeBins(values, binSize){
    const vals = values.map(v => v==null ? null : v);
    const bins = [];
    const valid = vals.filter(v=>v!=null);
    if(valid.length===0) return [];
    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const start = Math.floor(min / binSize) * binSize;
    const end = Math.ceil(max / binSize) * binSize;
    for(let b=start; b<end; b += binSize){
      const lo = b;
      const hi = +(b + binSize).toFixed(12);
      const indices = [];
      let sum=0, cnt=0;
      vals.forEach((v,i) => {
        if (v==null) return;
        if (v >= lo && v < hi){
          indices.push(i);
          sum += v; cnt++;
        }
      });
      bins.push({range: `${lo.toFixed(3)} - ${hi.toFixed(3)}`, count: cnt, indices, mean: cnt? sum/cnt : null});
    }
    return bins;
  }

  function renderAll(){
    const factor = parseFloat(factorInput.value) || 1;
    const container = document.getElementById('tables');
    container.innerHTML = '';
    const headers1 = ['Idx', 'Coef*Factor', 'X'];
    y_matrix[0] && y_matrix[0].forEach((_,i)=> headers1.push('Y'+(i+1)));
    headers1.push('Y Sumatoria');
    const rows1 = rows.map((r,i) => {
      const coef = (r.coef==null) ? null : r.coef * factor;
      const x = r.x;
      const yvals = (r.y || []).map(v => v);
      const sum = sumYs(r.y || []);
      return [i+1, coef, x, ...yvals, sum];
    });
    container.appendChild(buildTable('Coeficientes, X, Y1..Yn y Y Sumatoria', headers1, rows1));

    const normalizedX = normalize(xs);
    const ySums = y_matrix.map(r => sumYs(r));
    const normalizedY = normalize(ySums);
    const headers2 = ['Idx', 'X', 'X Normalizado', 'Y Sum', 'Y Normalizado'];
    const rows2 = rows.map((r,i) => [i+1, r.x, normalizedX[i], ySums[i], normalizedY[i]]);
    container.appendChild(buildTable('X normalizado y Y normalizado', headers2, rows2));
    const labels = rows.map((_,i)=> i+1);
    drawLineChart('c-normalized', labels, [{name:'Y Normalizado', data: normalizedY}]);

    const bins01 = computeBins(normalizedY, 0.1);
    const headersBin = ['Rango','Conteo','Media'];
    const rowsBin01 = bins01.map(b => [b.range, b.count, b.mean]);
    container.appendChild(buildTable('Y rango 0.1', headersBin, rowsBin01));
    const binLabels01 = bins01.map(b => b.range);
    const binCounts01 = bins01.map(b => b.count);
    drawLineChart('c-range-0-1', binLabels01, [{name:'Conteo (0.1)', data: binCounts01}]);

    const bins005 = computeBins(normalizedY, 0.05);
    const rowsBin005 = bins005.map(b => [b.range, b.count, b.mean]);
    container.appendChild(buildTable('Y rango 0.05', headersBin, rowsBin005));
    const binLabels005 = bins005.map(b => b.range);
    const binCounts005 = bins005.map(b => b.count);
    drawLineChart('c-range-0-05', binLabels005, [{name:'Conteo (0.05)', data: binCounts005}]);

    drawLineChart('c-combined', labels, [
      {name:'X Normalizado', data: normalizedX},
      {name:'Y Normalizado', data: normalizedY}
    ]);
  }

  applyBtn.addEventListener('click', function(){ renderAll(); });
  renderAll();

})();
