const studentTbody = document.getElementById('student-tbody');
const attendanceTbody = document.getElementById('attendance-tbody');
const createStudentBtn = document.getElementById('create-student-btn');
const studentDialog = document.getElementById('student-dialog');
const studentForm = document.getElementById('student-form');
const studentFormTitle = document.getElementById('student-form-title');
const cancelStudentBtn = document.getElementById('cancel-student-btn');
const checkinDialog = document.getElementById('checkin-dialog');
const checkinForm = document.getElementById('checkin-form');
const cancelCheckinBtn = document.getElementById('cancel-checkin-btn');
const attendanceFilterForm = document.getElementById('attendance-filter-form');
const filterStudentSelect = document.getElementById('filter-student-id');

let students = [];

function setErrors(form, errors) {
  form.querySelectorAll('[data-error-for]').forEach((node) => {
    node.textContent = errors[node.dataset.errorFor] || '';
  });
}

function validateStudentForm(data) {
  const errors = {};
  if (!data.name.trim()) errors.name = '姓名为必填项';
  if (!data.gender) errors.gender = '性别为必填项';
  if (!data.course_type.trim()) errors.course_type = '课程种类为必填项';

  const age = Number(data.age);
  if (!Number.isInteger(age) || age < 1 || age > 120) errors.age = '年龄需在 1-120';

  const enrollCount = Number(data.enroll_count);
  if (!Number.isInteger(enrollCount) || enrollCount < 1 || enrollCount > 1000) {
    errors.enroll_count = '报课次数需在 1-1000';
  }

  const totalAmount = Number(data.total_amount);
  if (Number.isNaN(totalAmount) || totalAmount < 0 || totalAmount > 9999999) {
    errors.total_amount = '总金额需在 0-9999999';
  }

  return errors;
}

function validateCheckinForm(data) {
  const errors = {};
  if (!data.date) errors.date = '日期为必填项';
  if (!data.time) errors.time = '时间为必填项';
  if (!data.content.trim()) errors.content = '内容为必填项';
  return errors;
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const json = await response.json();
  if (!response.ok) {
    throw json;
  }
  return json;
}

function renderStudents() {
  if (!students.length) {
    studentTbody.innerHTML = '<tr><td colspan="7" class="empty">暂无学生</td></tr>';
    return;
  }

  studentTbody.innerHTML = students.map((student) => {
    const disabled = student.remaining_lessons <= 0;
    const title = disabled ? '需先续课' : '点击签到';
    return `
      <tr data-id="${student.id}">
        <td>${student.name}</td>
        <td>${student.course_type}</td>
        <td>${student.enroll_count}</td>
        <td>${student.total_amount}</td>
        <td class="completed">${student.attended_count}</td>
        <td class="remaining">${student.remaining_lessons}</td>
        <td>
          <div class="action-group">
            <button type="button" class="secondary edit-btn" data-id="${student.id}">编辑</button>
            <button type="button" class="checkin-btn" data-id="${student.id}" ${disabled ? 'disabled' : ''} title="${title}">${disabled ? '需先续课' : '签到'}</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function renderAttendance(records) {
  if (!records.length) {
    attendanceTbody.innerHTML = '<tr><td colspan="4" class="empty">暂无签到记录</td></tr>';
    return;
  }

  attendanceTbody.innerHTML = records.map((item) => {
    const student = students.find((s) => s.id === Number(item.student_id));
    return `<tr><td>${student?.name || '-'}</td><td>${item.class_date}</td><td>${item.class_time}</td><td>${item.class_content}</td></tr>`;
  }).join('');
}

function refreshStudentFilterOptions() {
  const options = students
    .map((student) => `<option value="${student.id}">${student.name}</option>`)
    .join('');
  filterStudentSelect.innerHTML = '<option value="">全部</option>' + options;
}

async function loadStudents() {
  const json = await apiFetch('/api/students');
  students = json.data;
  renderStudents();
  refreshStudentFilterOptions();
}

async function loadAttendances(filters = {}) {
  const query = new URLSearchParams(filters);
  const json = await apiFetch(`/api/attendance?${query.toString()}`);
  renderAttendance(json.data);
}

createStudentBtn.addEventListener('click', () => {
  studentForm.reset();
  document.getElementById('student-id').value = '';
  document.getElementById('student-form-server-error').textContent = '';
  setErrors(studentForm, {});
  studentFormTitle.textContent = '新增学生';
  studentDialog.showModal();
});

cancelStudentBtn.addEventListener('click', () => studentDialog.close());
cancelCheckinBtn.addEventListener('click', () => checkinDialog.close());

studentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(studentForm).entries());
  const errors = validateStudentForm(data);
  setErrors(studentForm, errors);
  if (Object.keys(errors).length) return;

  const studentId = document.getElementById('student-id').value;
  const method = studentId ? 'PUT' : 'POST';
  const path = studentId ? `/api/students/${studentId}` : '/api/students';

  try {
    await apiFetch(path, { method, body: JSON.stringify(data) });
    studentDialog.close();
    await loadStudents();
  } catch (error) {
    document.getElementById('student-form-server-error').textContent = error.message || '保存失败';
  }
});

studentTbody.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  const id = Number(button.dataset.id);
  const targetStudent = students.find((item) => item.id === id);
  if (!targetStudent) return;

  if (button.classList.contains('edit-btn')) {
    studentFormTitle.textContent = '编辑学生';
    document.getElementById('student-id').value = String(targetStudent.id);
    Object.keys(targetStudent).forEach((key) => {
      const input = document.getElementById(key);
      if (input) {
        input.value = targetStudent[key];
      }
    });
    setErrors(studentForm, {});
    document.getElementById('student-form-server-error').textContent = '';
    studentDialog.showModal();
    return;
  }

  if (button.classList.contains('checkin-btn') && !button.disabled) {
    document.getElementById('checkin-student-id').value = String(id);
    document.getElementById('checkin-date').valueAsDate = new Date();
    document.getElementById('checkin-time').value = '18:00';
    document.getElementById('checkin-content').value = '';
    setErrors(checkinForm, {});
    document.getElementById('checkin-form-server-error').textContent = '';
    checkinDialog.showModal();
  }
});

checkinForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(checkinForm).entries());
  const errors = validateCheckinForm(formData);
  setErrors(checkinForm, errors);
  if (Object.keys(errors).length) return;

  const payload = {
    student_id: Number(document.getElementById('checkin-student-id').value),
    date: formData.date,
    time: `${formData.time}:00`,
    content: formData.content.trim()
  };

  try {
    const json = await apiFetch('/api/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const targetRow = studentTbody.querySelector(`tr[data-id="${payload.student_id}"]`);
    if (targetRow) {
      targetRow.querySelector('.completed').textContent = String(json.data.student.completed_lessons);
      targetRow.querySelector('.remaining').textContent = String(json.data.student.remaining_lessons);
    }

    students = students.map((item) => item.id === payload.student_id
      ? {
        ...item,
        attended_count: json.data.student.completed_lessons,
        remaining_lessons: json.data.student.remaining_lessons
      }
      : item);

    renderStudents();
    checkinDialog.close();
    await loadAttendances(Object.fromEntries(new FormData(attendanceFilterForm).entries()));
  } catch (error) {
    document.getElementById('checkin-form-server-error').textContent = error.message || '签到失败';
  }
});

attendanceFilterForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const filters = Object.fromEntries(new FormData(attendanceFilterForm).entries());
  Object.keys(filters).forEach((key) => {
    if (!filters[key]) delete filters[key];
  });
  await loadAttendances(filters);
});

async function bootstrap() {
  await loadStudents();
  await loadAttendances();
}

bootstrap();
