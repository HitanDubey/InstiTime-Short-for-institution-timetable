window.timetable = (function() {
  // ----- Configuration (fixed to match jpeg) -----
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = [
    '9:30 - 10:30',
    '10:30 - 11:30',
    '11:30 - 12:25',
    '12:25 - 1:20',
    '1:20 - 2:00',
    '2:00 - 2:50',
    '2:50 - 3:40',
    '3:40 - 4:30'
  ];

  // ----- Helper: course color (based on code) -----
  function getCourseColor(code) {
    const colors = [
      { bg: '#e8f0fe', text: '#1a73e8' },
      { bg: '#e6f4ea', text: '#137333' },
      { bg: '#fce8e6', text: '#c5221f' },
      { bg: '#fef7e0', text: '#b06000' },
      { bg: '#f3e8fd', text: '#8430ce' },
      { bg: '#e8eaed', text: '#3c4043' },
    ];
    let idx = 0;
    for (let i = 0; i < code.length; i++) idx += code.charCodeAt(i);
    return colors[idx % colors.length];
  }

  // ----- Create empty grid (days × slots) -----
  function createGrid() {
    return days.map(day => ({
      day,
      slots: timeSlots.map(time => ({ time, course: null }))
    }));
  }

  // ----- Check if consecutive slots are free (no course, not lunch) -----
  function isFree(slots, startIdx, duration, lunchIndices) {
    if (startIdx + duration > slots.length) return false;
    for (let i = 0; i < duration; i++) {
      const idx = startIdx + i;
      if (slots[idx].course !== null) return false;
      if (lunchIndices.includes(idx)) return false; // lunch blocked
    }
    return true;
  }

  // ----- Assign a single course (randomized greedy) -----
  function assignCourse(course, grid, lunchIndices) {
    // Deterministic greedy: try earliest days and earliest slots first.
    let assigned = 0;
    const usedDays = new Set();

    // First pass: try to place one session per day (spread across different days)
    for (let d = 0; d < days.length && assigned < course.sessions; d++) {
      const day = days[d];
      const daySlots = grid.find(x => x.day === day).slots;
      const maxStart = daySlots.length - course.duration;
      if (maxStart < 0) continue;
      for (let s = 0; s <= maxStart && assigned < course.sessions; s++) {
        if (isFree(daySlots, s, course.duration, lunchIndices)) {
          for (let i = 0; i < course.duration; i++) daySlots[s + i].course = course;
          assigned++;
          usedDays.add(day);
          break; // move to next day to spread sessions
        }
      }
    }

    // Second pass: if still sessions left, fill earliest free slots (may reuse days)
    if (assigned < course.sessions) {
      for (let d = 0; d < days.length && assigned < course.sessions; d++) {
        const day = days[d];
        const daySlots = grid.find(x => x.day === day).slots;
        const maxStart = daySlots.length - course.duration;
        if (maxStart < 0) continue;
        for (let s = 0; s <= maxStart && assigned < course.sessions; s++) {
          if (isFree(daySlots, s, course.duration, lunchIndices)) {
            for (let i = 0; i < course.duration; i++) daySlots[s + i].course = course;
            assigned++;
          }
        }
      }
    }
    // Any remaining sessions that couldn't be placed are ignored.
  }

  // ----- Mark lunch slots as blocked -----
  function blockLunchSlots(grid, lunchStartLabel, duration) {
    const lunchIdx = timeSlots.indexOf(lunchStartLabel);
    if (lunchIdx === -1) return [];
    const indices = [];
    for (let i = 0; i < duration; i++) {
      if (lunchIdx + i < timeSlots.length) indices.push(lunchIdx + i);
    }
    // Place a special "Lunch" marker in the grid for display (won't be used by courses)
    days.forEach(day => {
      const daySlots = grid.find(d => d.day === day).slots;
      indices.forEach(idx => {
        if (idx < daySlots.length) {
          daySlots[idx].course = { 
            code: 'Lunch', 
            name: 'Lunch Break', 
            faculty: '', 
            type: 'break',
            room: ''
          };
        }
      });
    });
    return indices;
  }

  // ----- Main generation -----
  function generate() {
    const grid = createGrid();
    const courses = window.courses || [];

    // Ensure empty slot label available (from form/localStorage)
    if (!window.emptySlotLabel) {
      try { window.emptySlotLabel = localStorage.getItem('timetableEmptyLabel') || 'Library / Free Lecture'; } catch (e) { window.emptySlotLabel = 'Library / Free Lecture'; }
    }

    // Prepare lunch blocked indices
    let lunchIndices = [];
    if (window.lunchConfig?.enabled) {
      lunchIndices = blockLunchSlots(grid, window.lunchConfig.startSlot, window.lunchConfig.duration);
    }

    // Assign each course
    courses.forEach(course => assignCourse(course, grid, lunchIndices));

    // Fill remaining free slots with user label to make timetable clearer
    for (let d = 0; d < grid.length; d++) {
      const daySlots = grid[d].slots;
      for (let s = 0; s < daySlots.length; s++) {
        if (daySlots[s].course === null) {
          daySlots[s].course = {
            code: window.emptySlotLabel || 'Library / Free Lecture',
            name: window.emptySlotLabel || 'Library / Free Lecture',
            faculty: '',
            type: 'break',
            room: ''
          };
        }
      }
    }

    // Store for export
    window.currentTimetableGrid = grid;
    window.currentTimeSlots = timeSlots;
    window.currentDays = days;

    // Render UI
    renderTimetable(grid);
    renderLegend(courses);
    renderHeader();
  }

  // ----- Render timetable header (college info) -----
  function renderHeader() {
    const h = window.headerInfo || {};
    const div = document.getElementById('timetableHeader');
    div.innerHTML = `
      <h3>${h.institute || 'DELHI TECHNICAL CAMPUS, Greater Noida'}</h3>
      <p>${h.session || 'Time Table (Odd Session 2025-26)'} · ${h.semester || 'BCA III YEAR 6TH SEM'}</p>
      <p>Room No : ${h.room || 'C11 (BLOCK-C)'}  &nbsp; w.e.f : ${h.effDate || '21.01.2026'}</p>
    `;
  }

  // ----- Render timetable as grid (days rows, time columns) -----
  function renderTimetable(grid) {
    const container = document.getElementById('timetableGrid');
    container.innerHTML = '';
    container.style.gridTemplateColumns = `140px repeat(${timeSlots.length}, 1fr)`;

    // Header row : empty corner + time slots
    const headerRow = document.createElement('div');
    headerRow.className = 'grid-row';
    const corner = document.createElement('div');
    corner.className = 'grid-header-cell';
    corner.innerHTML = '<i class="fas fa-calendar-alt"></i>';
    headerRow.appendChild(corner);
    timeSlots.forEach(time => {
      const cell = document.createElement('div');
      cell.className = 'grid-header-cell';
      cell.textContent = time;
      headerRow.appendChild(cell);
    });
    container.appendChild(headerRow);

    // Day rows
    days.forEach(day => {
      const dayGrid = grid.find(d => d.day === day);
      const row = document.createElement('div');
      row.className = 'grid-row';

      const dayCell = document.createElement('div');
      dayCell.className = 'grid-day-cell';
      dayCell.textContent = day;
      row.appendChild(dayCell);

      timeSlots.forEach((time, idx) => {
        const slot = dayGrid.slots[idx];
        const cell = document.createElement('div');
        cell.className = 'grid-cell';

        if (slot.course) {
          if (slot.course.code === 'Lunch') {
            cell.classList.add('lunch-slot');
            cell.textContent = 'LUNCH';
          } else {
            const color = getCourseColor(slot.course.code);
            cell.classList.add('course-slot');
            // Display: Code + optional Lab/Room
            let display = slot.course.code;
            if (slot.course.type === 'lab' && slot.course.room) {
              display += ` (${slot.course.room})`;
            } else if (slot.course.room) {
              display += ` (${slot.course.room})`;
            }
            cell.textContent = display;
            cell.style.backgroundColor = color.bg;
            cell.style.color = color.text;
            cell.title = `${slot.course.name}\n${slot.course.faculty}`;
          }
        } else {
          cell.classList.add('free-slot');
          cell.textContent = '';
        }

        // animation
        cell.style.opacity = '0';
        cell.style.transform = 'scale(0.95)';
        setTimeout(() => {
          cell.style.opacity = '1';
          cell.style.transform = 'scale(1)';
          cell.style.transition = 'all 0.3s';
        }, 30 * (idx + days.indexOf(day) * 2));

        row.appendChild(cell);
      });
      container.appendChild(row);
    });
  }

  // ----- Render subject & faculty legend -----
  function renderLegend(courses) {
    const legendDiv = document.getElementById('courseLegend');
    if (!courses.length) {
      legendDiv.innerHTML = '';
      return;
    }
    let html = '<div class="legend-title">📖 SUBJECT & CODE · FACULTY</div><div class="legend-grid">';
    courses.forEach(c => {
      html += `
        <div class="legend-item">
          <span class="legend-code">${c.code}</span>
          <span class="legend-name">${c.name}</span>
          <span class="legend-faculty">${c.faculty}</span>
        </div>
      `;
    });
    html += '</div>';
    legendDiv.innerHTML = html;
  }

  // ----- EXPORT: get 2D array representation -----
  function getExportData() {
    const grid = window.currentTimetableGrid;
    if (!grid) return null;

    const rows = [];
    // Header: first cell empty, then time slots
    const header = ['Day / Time', ...timeSlots];
    rows.push(header);

    days.forEach(day => {
      const dayGrid = grid.find(d => d.day === day);
      const row = [day];
      timeSlots.forEach((time, idx) => {
        const slot = dayGrid.slots[idx];
        if (slot.course) {
          let text = slot.course.code;
          if (slot.course.code === 'Lunch') text = 'LUNCH';
          else if (slot.course.type === 'lab' && slot.course.room) text += ` (${slot.course.room})`;
          else if (slot.course.room) text += ` (${slot.course.room})`;
          row.push(text);
        } else {
          row.push('');
        }
      });
      rows.push(row);
    });

    // Append legend as additional rows (for Excel/CSV)
    rows.push([]);
    rows.push(['SUBJECT CODE', 'SUBJECT NAME', 'FACULTY']);
    window.courses.forEach(c => {
      rows.push([c.code, c.name, c.faculty]);
    });

    return rows;
  }

  // ----- Export implementations (same as before) -----
  function exportPDF() {
    const data = getExportData();
    if (!data) return alert('No timetable to export.');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    // Only include header + day rows (first 1 + days.length rows)
    const head = [data[0]];
    const body = data.slice(1, 1 + days.length);
    doc.autoTable({
      head,
      body,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [66, 133, 244] },
      startY: 10,
      margin: { left: 8, right: 8 }
    });
    doc.save('timetable.pdf');
  }

  function exportExcel() {
    const data = getExportData();
    if (!data) return alert('No timetable to export.');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Timetable');
    XLSX.writeFile(wb, 'timetable.xlsx');
  }

  function exportCSV() {
    const data = getExportData();
    if (!data) return alert('No timetable to export.');
    const csv = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'timetable.csv');
  }

  function exportWord() {
    const data = getExportData();
    if (!data) return alert('No timetable to export.');
    let html = `<html><head><meta charset="UTF-8"><title>Timetable</title></head><body>`;
    html += `<h2>${window.headerInfo?.institute || 'Timetable'}</h2>`;
    html += `<p>${window.headerInfo?.session || ''} · ${window.headerInfo?.semester || ''}</p>`;
    html += `<p>Room: ${window.headerInfo?.room || ''}  w.e.f: ${window.headerInfo?.effDate || ''}</p>`;
    html += `<table border="1" cellpadding="5" style="border-collapse:collapse;">`;
    data.forEach((row, i) => {
      if (i === 0) html += '<thead><tr>';
      else html += '<tr>';
      row.forEach(cell => html += `<td>${cell}</td>`);
      html += i === 0 ? '</tr></thead>' : '</tr>';
    });
    html += '</table></body></html>';
    const blob = new Blob([html], { type: 'application/msword' });
    saveAs(blob, 'timetable.doc');
  }

  return { generate, exportPDF, exportExcel, exportCSV, exportWord };
})();