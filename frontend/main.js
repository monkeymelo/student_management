const listPage = document.getElementById('list-page');
const detailPage = document.getElementById('detail-page');
const studentList = document.getElementById('student-list');
const attendanceTbody = document.getElementById('attendance-tbody');
const searchInput = document.getElementById('search-input');
const backBtn = document.getElementById('back-btn');
const detailCard = document.getElementById('student-detail-card');

const createStudentBtn = document.getElementById('create-student-btn');
const studentDialog = document.getElementById('student-dialog');
const studentForm = document.getElementById('student-form');
const cancelStudentBtn = document.getElementById('cancel-student-btn');

const checkinDialog = document.getElementById('checkin-dialog');
const checkinForm = document.getElementById('checkin-form');
const cancelCheckinBtn = document.getElementById('cancel-checkin-btn');

let students = [];
let selectedStudentId = null;
let keyword = '';

function setErrors(form, errors) {
  form.querySelectorAll('[data-error-for]').forEach((node) => {
    node.textContent = errors[node.dataset.errorFor] || '';
  });
}

function genderText(gender) {
  if (gender === 'male') return '男';
  if (gender === 'female') return '女';
  return '其他';
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
    errors.enroll_count = '报课总数需在 1-1000';
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
  if (!data.content.trim()) errors.content = '课程内容为必填项';
  return errors;
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const json = await response.json();
  if (!response.ok) throw json;
  return json;
}

function renderStudents() {
  const filtered = students.filter((student) => {
    if (!keyword.trim()) return true;
    const searchText = `${student.name} ${student.course_type}`.toLowerCase();
    return searchText.includes(keyword.trim().toLowerCase());
  });

  if (!filtered.length) {
    studentList.innerHTML = '<div class="empty">暂无符合条件的学生</div>';
    return;
  }

  studentList.innerHTML = filtered.map((student) => `
    <button type="button" class="student-item" data-id="${student.id}">
      <div>
        <p class="name-row">${student.name} <span>${genderText(student.gender)} · ${student.age}岁</span></p>
        <p class="sub">${student.course_type}</p>
      </div>
      <div class="progress">课程进度：已上 ${student.attended_count} / 总 ${student.enroll_count}</div>
    </button>
  `).join('');
}

function openListPage() {
  detailPage.classList.remove('active');
  listPage.classList.add('active');
  selectedStudentId = null;
}

async function openDetailPage(studentId) {
  selectedStudentId = Number(studentId);
  const json = await apiFetch(`/api/students/${selectedStudentId}`);
  const student = json.data;

  listPage.classList.remove('active');
  detailPage.classList.add('active');

  detailCard.innerHTML = `
    <div class="detail-top">
      <div>
        <h2>${student.name}</h2>
        <p>${genderText(student.gender)} · ${student.age}岁</p>
        <p>${student.course_type}</p>
      </div>
      <button type="button" id="detail-checkin-btn" ${student.remaining_lessons <= 0 ? 'disabled' : ''}>上课签到</button>
    </div>
    <div class="detail-grid">
      <p><span>课程进度</span><strong>已上 ${student.attended_count} / 剩余 ${student.remaining_lessons}</strong></p>
      <p><span>报课总数</span><strong>${student.enroll_count}</strong></p>
      <p><span>总金额</span><strong>¥${Number(student.total_amount).toFixed(2)}</strong></p>
    </div>
  `;

  const records = await apiFetch(`/api/attendance?student_id=${selectedStudentId}`);
  renderAttendances(records.data);
}

function renderAttendances(records) {
  if (!records.length) {
    attendanceTbody.innerHTML = '<tr><td colspan="3" class="empty">暂无签到记录</td></tr>';
    return;
  }

  attendanceTbody.innerHTML = records.map((item) => `
    <tr>
      <td>${item.class_date}</td>
      <td>${item.class_time.slice(0, 5)}</td>
      <td>${item.class_content}</td>
    </tr>
  `).join('');
}

async function loadStudents() {
  const json = await apiFetch('/api/students');
  students = json.data;
  renderStudents();
}

searchInput.addEventListener('input', (event) => {
  keyword = event.target.value;
  renderStudents();
});

studentList.addEventListener('click', async (event) => {
  const item = event.target.closest('.student-item');
  if (!item) return;
  await openDetailPage(item.dataset.id);
});

backBtn.addEventListener('click', () => openListPage());

createStudentBtn.addEventListener('click', () => {
  studentForm.reset();
  setErrors(studentForm, {});
  document.getElementById('student-form-server-error').textContent = '';
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

  try {
    await apiFetch('/api/students', { method: 'POST', body: JSON.stringify(data) });
    studentDialog.close();
    await loadStudents();
  } catch (error) {
    document.getElementById('student-form-server-error').textContent = error.message || '保存失败';
  }
});

detailCard.addEventListener('click', (event) => {
  const btn = event.target.closest('#detail-checkin-btn');
  if (!btn || btn.disabled || !selectedStudentId) return;

  document.getElementById('checkin-student-id').value = String(selectedStudentId);
  document.getElementById('checkin-date').valueAsDate = new Date();
  document.getElementById('checkin-time').value = '18:00';
  document.getElementById('checkin-content').value = '';
  setErrors(checkinForm, {});
  document.getElementById('checkin-form-server-error').textContent = '';
  checkinDialog.showModal();
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
    await apiFetch('/api/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    checkinDialog.close();
    await loadStudents();
    await openDetailPage(payload.student_id);
  } catch (error) {
    document.getElementById('checkin-form-server-error').textContent = error.message || '签到失败';
  }
});

loadStudents();
