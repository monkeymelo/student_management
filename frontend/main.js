const listPage = document.getElementById('list-page');
const detailPage = document.getElementById('detail-page');
const studentList = document.getElementById('student-list');
const attendanceTbody = document.getElementById('attendance-tbody');
const searchInput = document.getElementById('search-input');
const backBtn = document.getElementById('back-btn');
const detailCard = document.getElementById('student-detail-card');
const topDeleteBtn = document.getElementById('top-delete-btn');

const topListBtn = document.getElementById('top-list-btn');
const topCreateBtn = document.getElementById('top-create-btn');
const studentDialog = document.getElementById('student-dialog');
const studentForm = document.getElementById('student-form');
const cancelStudentBtn = document.getElementById('cancel-student-btn');
const courseTypeSelect = document.getElementById('course_type');
const newCourseTypeRow = document.getElementById('new-course-type-row');
const newCourseTypeInput = document.getElementById('new-course-type');
const addCourseTypeBtn = document.getElementById('add-course-type-btn');

const checkinDialog = document.getElementById('checkin-dialog');
const checkinForm = document.getElementById('checkin-form');
const cancelCheckinBtn = document.getElementById('cancel-checkin-btn');

const renewDialog = document.getElementById('renew-dialog');
const renewForm = document.getElementById('renew-form');
const cancelRenewBtn = document.getElementById('cancel-renew-btn');

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
  if (data.time && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(data.time)) {
    errors.time = '请输入24小时制时间（例如 18:00）';
  }
  return errors;
}

function validateRenewForm(data) {
  const errors = {};
  const amount = Number(data.amount);
  if (Number.isNaN(amount) || amount <= 0 || amount > 9999999) {
    errors.amount = '续费金额需大于 0 且不超过 9999999';
  }

  const enrollCount = Number(data.enroll_count);
  if (!Number.isInteger(enrollCount) || enrollCount <= 0 || enrollCount > 1000) {
    errors.enroll_count = '续课次数需在 1-1000';
  }

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
      <div class="progress">
        <div>课程进度：剩余 <span class="${student.remaining_lessons < 5 ? 'danger' : 'safe'}">${student.remaining_lessons}</span>/${student.enroll_count}</div>
        <small>已上：${student.attended_count}节</small>
      </div>
    </button>
  `).join('');
}

function openListPage() {
  detailPage.classList.remove('active');
  listPage.classList.add('active');
  selectedStudentId = null;
}

function openStudentDialog() {
  studentForm.reset();
  courseTypeSelect.value = '创想课';
  newCourseTypeRow.classList.add('hidden');
  newCourseTypeInput.value = '';
  setErrors(studentForm, {});
  document.getElementById('student-form-server-error').textContent = '';
  studentDialog.showModal();
}

async function openDetailPage(studentId) {
  selectedStudentId = Number(studentId);
  const json = await apiFetch(`/api/students/${selectedStudentId}`);
  const student = json.data;

  listPage.classList.remove('active');
  detailPage.classList.add('active');

  const progressPercent = student.enroll_count > 0
    ? Math.min(100, Math.round((student.attended_count / student.enroll_count) * 100))
    : 0;

  detailCard.innerHTML = `
    <div class="detail-top">
      <div>
        <h2>${student.name}</h2>
        <p>${genderText(student.gender)} · ${student.age}岁</p>
        <p>${student.course_type}</p>
      </div>
      <div class="detail-actions">
        <button type="button" id="detail-renew-btn">续费</button>
        <button type="button" id="detail-checkin-btn" ${student.remaining_lessons <= 0 ? 'disabled' : ''}>上课签到</button>
      </div>
    </div>
    <div class="detail-grid">
      <p><span>课程进度</span><strong>已上 ${student.attended_count} / 剩余 ${student.remaining_lessons}</strong></p>
      <div class="detail-progress-track"><div class="detail-progress-fill" style="width:${progressPercent}%"></div></div>
      <p><span>报课总数</span><strong>${student.enroll_count}</strong></p>
      <p><span>总金额</span><strong>¥${Number(student.total_amount).toFixed(2)}</strong></p>
    </div>
  `;

  const records = await apiFetch(`/api/attendance?student_id=${selectedStudentId}`);
  renderAttendances(records.data);
}

function renderAttendances(records) {
  if (!records.length) {
    attendanceTbody.innerHTML = '<tr><td colspan="4" class="empty">暂无签到记录</td></tr>';
    return;
  }

  attendanceTbody.innerHTML = records.map((item) => `
    <tr>
      <td>${item.class_date}</td>
      <td>${item.class_time.slice(0, 5)}</td>
      <td>${item.class_content}</td>
      <td><button type="button" class="danger-ghost-btn attendance-delete-btn" data-id="${item.id}">删除</button></td>
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

topCreateBtn.addEventListener('click', () => openStudentDialog());

topListBtn.addEventListener('click', () => openListPage());

cancelStudentBtn.addEventListener('click', () => studentDialog.close());

courseTypeSelect.addEventListener('change', () => {
  if (courseTypeSelect.value === '__add_new__') {
    newCourseTypeRow.classList.remove('hidden');
    newCourseTypeInput.focus();
    return;
  }

  newCourseTypeRow.classList.add('hidden');
});

addCourseTypeBtn.addEventListener('click', () => {
  const value = newCourseTypeInput.value.trim();
  if (!value) return;

  const existing = Array.from(courseTypeSelect.options).find((option) => option.value === value);
  if (!existing) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    courseTypeSelect.insertBefore(option, courseTypeSelect.querySelector('option[value="__add_new__"]'));
  }

  courseTypeSelect.value = value;
  newCourseTypeRow.classList.add('hidden');
  newCourseTypeInput.value = '';
});
cancelCheckinBtn.addEventListener('click', () => checkinDialog.close());
cancelRenewBtn.addEventListener('click', () => renewDialog.close());

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

detailCard.addEventListener('click', async (event) => {
  const checkinBtn = event.target.closest('#detail-checkin-btn');
  if (checkinBtn) {
    if (checkinBtn.disabled || !selectedStudentId) return;

    document.getElementById('checkin-student-id').value = String(selectedStudentId);
    document.getElementById('checkin-date').valueAsDate = new Date();
    document.getElementById('checkin-time').value = '18:00';
    document.getElementById('checkin-content').value = '';
    setErrors(checkinForm, {});
    document.getElementById('checkin-form-server-error').textContent = '';
    checkinDialog.showModal();
    return;
  }

  const renewBtn = event.target.closest('#detail-renew-btn');
  if (renewBtn && selectedStudentId) {
    document.getElementById('renew-student-id').value = String(selectedStudentId);
    document.getElementById('renew-amount').value = '';
    document.getElementById('renew-enroll-count').value = '';
    setErrors(renewForm, {});
    document.getElementById('renew-form-server-error').textContent = '';
    renewDialog.showModal();
    return;
  }

});


attendanceTbody.addEventListener('click', async (event) => {
  const deleteBtn = event.target.closest('.attendance-delete-btn');
  if (!deleteBtn || !selectedStudentId) return;

  const attendanceId = deleteBtn.dataset.id;
  const confirmed = window.confirm('确认删除该签到记录？删除后会回滚课时统计。');
  if (!confirmed) return;

  try {
    await apiFetch(`/api/attendance/${attendanceId}`, { method: 'DELETE' });
    await loadStudents();
    await openDetailPage(selectedStudentId);
  } catch (error) {
    window.alert(error.message || '删除签到记录失败');
  }
});

topDeleteBtn.addEventListener('click', async () => {
  if (!selectedStudentId) return;

  const confirmed = window.confirm('确认删除该学生？此操作会删除该学生及所有签到记录，且无法恢复。');
  if (!confirmed) return;

  try {
    await apiFetch(`/api/students/${selectedStudentId}`, { method: 'DELETE' });
    openListPage();
    await loadStudents();
  } catch (error) {
    window.alert(error.message || '删除失败');
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

renewForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(renewForm).entries());
  const errors = validateRenewForm(formData);
  setErrors(renewForm, errors);
  if (Object.keys(errors).length) return;

  const studentId = Number(document.getElementById('renew-student-id').value);
  const payload = {
    amount: Number(formData.amount),
    enroll_count: Number(formData.enroll_count)
  };

  try {
    await apiFetch(`/api/students/${studentId}/renew`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    renewDialog.close();
    await loadStudents();
    await openDetailPage(studentId);
  } catch (error) {
    document.getElementById('renew-form-server-error').textContent = error.message || '续费失败';
  }
});

loadStudents();
