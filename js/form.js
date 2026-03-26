document.addEventListener('DOMContentLoaded', () => {
  window.form = (function() {
    const container = document.getElementById('courseContainer');
    const previewTbody = document.querySelector('#previewTable tbody');
    const previewHeaderDiv = document.getElementById('previewHeader');

    // ---------- Add a new course row (with all fields) ----------
    function addCourseRow() {
      const row = document.createElement('div');
      row.className = 'course-row';
      row.style.opacity = '0';
      row.innerHTML = `
        <div class="input-field"><input class="code" type="text" placeholder=" "><label>Code</label></div>
        <div class="input-field"><input class="subname" type="text" placeholder=" "><label>Subject Name</label></div>
        <div class="input-field"><input class="faculty" type="text" placeholder=" "><label>Faculty</label></div>
        <div class="input-field">
          <select class="type">
            <option value="theory">Theory</option>
            <option value="lab">Lab</option>
          </select>
          <label>Type</label>
        </div>
        <div class="input-field"><input class="sessions" type="number" min="1" max="6" placeholder=" "><label>Sess/Wk</label></div>
        <div class="input-field"><input class="duration" type="number" min="1" max="3" placeholder=" "><label>Dur (hrs)</label></div>
        <div class="input-field"><input class="room" type="text" placeholder=" " value=""><label>Room (opt)</label></div>
        <button class="remove-row" aria-label="Remove"><i class="fas fa-times"></i></button>
      `;
      container.appendChild(row);

      setTimeout(() => {
        row.style.opacity = '1';
        row.style.transform = 'translateX(0)';
        row.style.transition = 'opacity 0.3s, transform 0.3s';
      }, 10);

      row.querySelector('.remove-row').addEventListener('click', () => {
        row.style.opacity = '0';
        row.style.transform = 'translateX(-20px)';
        setTimeout(() => row.remove(), 300);
      });

      // Auto‑focus on code of first row
      if (container.children.length === 1)
        setTimeout(() => row.querySelector('.code').focus(), 300);
    }

    // Attach add button
    document.getElementById('addCourseBtn').addEventListener('click', addCourseRow);
    addCourseRow(); // start with one row

    // ---------- Collect & Validate ----------
    function validate() {
      // ---- 1. Institution info ----
      const institute = document.getElementById('instituteName').value.trim();
      const session = document.getElementById('sessionTitle').value.trim();
      const semester = document.getElementById('semester').value.trim();
      const room = document.getElementById('roomNo').value.trim();
      const effDate = document.getElementById('effectiveDate').value.trim();
      if (!institute || !session || !semester || !room || !effDate) {
        showNotification('Please fill all institution fields', 'error');
        return false;
      }
      window.headerInfo = { institute, session, semester, room, effDate };

      // ---- 2. Lunch settings ----
      window.lunchConfig = {
        enabled: document.getElementById('enableLunch').checked,
        startSlot: document.getElementById('lunchStart').value,
        duration: parseInt(document.getElementById('lunchDuration').value, 10)
      };

      // Empty slot label (e.g. Library / Free Lecture)
      const emptyLabel = (document.getElementById('emptySlotLabel')?.value || 'Library / Free Lecture').trim();
      window.emptySlotLabel = emptyLabel || 'Library / Free Lecture';
      try { localStorage.setItem('timetableEmptyLabel', window.emptySlotLabel); } catch (e) {}

      // ---- 3. Courses ----
      const rows = Array.from(container.querySelectorAll('.course-row'));
      if (rows.length === 0) {
        showNotification('Add at least one course', 'error');
        return false;
      }

      const courses = [];
      for (let row of rows) {
        const code = row.querySelector('.code')?.value.trim().toUpperCase();
        const name = row.querySelector('.subname')?.value.trim();
        const faculty = row.querySelector('.faculty')?.value.trim();
        const type = row.querySelector('.type')?.value;
        const sessions = row.querySelector('.sessions')?.value;
        const duration = row.querySelector('.duration')?.value;
        const customRoom = row.querySelector('.room')?.value.trim();

        if (!code || !name || !faculty || !sessions || !duration) {
          showNotification('All fields except optional room are required', 'error');
          return false;
        }
        if (isNaN(sessions) || sessions < 1 || isNaN(duration) || duration < 1) {
          showNotification('Sessions & duration must be positive numbers', 'error');
          return false;
        }
        courses.push({
          code, name, faculty, type,
          sessions: parseInt(sessions, 10),
          duration: parseInt(duration, 10),
          room: customRoom || (type === 'lab' ? 'Lab' : '')
        });
      }

      // Check duplicate codes
      const codes = courses.map(c => c.code);
      if (new Set(codes).size !== codes.length) {
        showNotification('Duplicate course codes are not allowed', 'error');
        return false;
      }

      window.courses = courses;
      try { localStorage.setItem('timetableCourses', JSON.stringify(window.courses)); } catch (e) {}

      // ---- 4. Render preview ----
      renderPreview(institute, session, semester, room, effDate, courses);
      return true;
    }

    // ---------- Render preview table and header ----------
    function renderPreview(institute, session, semester, room, effDate, courses) {
      previewHeaderDiv.innerHTML = `
        <strong>${institute}</strong> · ${session} · ${semester}<br>
        Room: ${room} · w.e.f ${effDate}
      `;

      previewTbody.innerHTML = '';
      courses.forEach((c, i) => {
        const tr = document.createElement('tr');
        tr.style.opacity = '0';
        tr.innerHTML = `
          <td>${c.code}</td>
          <td>${c.name}</td>
          <td>${c.faculty}</td>
          <td>${c.type}</td>
          <td>${c.sessions}</td>
          <td>${c.duration}</td>
          <td>${c.room || '—'}</td>
          <td><button class="remove-btn" data-index="${i}"><i class="fas fa-trash-alt"></i></button></td>
        `;
        previewTbody.appendChild(tr);
        setTimeout(() => {
          tr.style.opacity = '1';
          tr.style.transform = 'translateY(0)';
          tr.style.transition = 'opacity 0.3s, transform 0.3s';
        }, 50 * i);
      });

      // Remove from preview also removes from form
      previewTbody.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = e.currentTarget.dataset.index;
          const row = e.currentTarget.closest('tr');
          row.style.opacity = '0';
          row.style.transform = 'translateY(10px)';
          setTimeout(() => {
            row.remove();
            // also remove the corresponding course row in step1
            const courseRows = container.querySelectorAll('.course-row');
            if (courseRows[idx]) courseRows[idx].remove();
          }, 300);
        });
      });
    }

    // Notification helper
    function showNotification(msg, type = 'info') {
      const n = document.createElement('div');
      n.className = `notification ${type}`;
      n.innerHTML = `<div class="notification-content"><i class="fas ${type==='error'?'fa-exclamation-circle':'fa-info-circle'}"></i><span>${msg}</span></div>`;
      document.body.appendChild(n);
      setTimeout(() => { n.style.transform = 'translateY(0)'; n.style.opacity = '1'; }, 10);
      setTimeout(() => { n.style.transform = 'translateY(-20px)'; n.style.opacity = '0'; setTimeout(() => n.remove(), 300); }, 3000);
    }

    return { validate };
  })();
});