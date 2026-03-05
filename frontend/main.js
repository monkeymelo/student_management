const listPage = document.getElementById('list-page');
const detailPage = document.getElementById('detail-page');
const masterTimetablePage = document.getElementById('master-timetable-page');
const studentList = document.getElementById('student-list');
const attendanceTbody = document.getElementById('attendance-tbody');
const searchInput = document.getElementById('search-input');
const backBtn = document.getElementById('back-btn');
const detailCard = document.getElementById('student-detail-card');
const topDeleteBtn = document.getElementById('top-delete-btn');

const topListBtn = document.getElementById('top-list-btn');
const topMasterTimetableBtn = document.getElementById('top-master-timetable-btn');
const topCreateBtn = document.getElementById('top-create-btn');
const studentDialog = document.getElementById('student-dialog');
const studentForm = document.getElementById('student-form');
const cancelStudentBtn = document.getElementById('cancel-student-btn');
const courseTypeSelect = document.getElementById('course_type');
const newCourseTypeRow = document.getElementById('new-course-type-row');
const newCourseTypeInput = document.getElementById('new-course-type');
const addCourseTypeBtn = document.getElementById('add-course-type-btn');
const addScheduleBtn = document.getElementById('add-schedule-btn');
const scheduleList = document.getElementById('schedule-list');
const masterTimetableContainer = document.getElementById('master-timetable');

const checkinDialog = document.getElementById('checkin-dialog');
const checkinForm = document.getElementById('checkin-form');
const cancelCheckinBtn = document.getElementById('cancel-checkin-btn');
const batchCheckinDialog = document.getElementById('batch-checkin-dialog');
const batchCheckinForm = document.getElementById('batch-checkin-form');
const cancelBatchCheckinBtn = document.getElementById('cancel-batch-checkin-btn');
const batchStudentList = document.getElementById('batch-student-list');

const renewDialog = document.getElementById('renew-dialog');
const renewForm = document.getElementById('renew-form');
const cancelRenewBtn = document.getElementById('cancel-renew-btn');
const remarkDialog = document.getElementById('remark-dialog');
const remarkForm = document.getElementById('remark-form');
const cancelRemarkBtn = document.getElementById('cancel-remark-btn');

let students = [];
let selectedStudentId = null;
let keyword = '';
let editingStudentId = null;
let masterTimetable = [];

const WEEKDAY_OPTIONS = [
  { value: '1', label: '周一' },
  { value: '2', label: '周二' },
  { value: '3', label: '周三' },
  { value: '4', label: '周四' },
  { value: '5', label: '周五' },
  { value: '6', label: '周六' },
  { value: '7', label: '周日' }
];


const WEEKDAY_VALUES = [1, 2, 3, 4, 5, 6, 7];

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
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

function weekdayText(weekday) {
  const found = WEEKDAY_OPTIONS.find((option) => Number(option.value) === Number(weekday));
  return found ? found.label : '未知';
}

function formatScheduleTimeRange(schedule) {
  return `${String(schedule.start_time || '').slice(0, 5)}-${String(schedule.end_time || '').slice(0, 5)}`;
}

function renderScheduleRow(schedule = {}) {
  const row = document.createElement('div');
  row.className = 'schedule-row';
  row.innerHTML = `
    <select class="schedule-weekday" aria-label="上课周几">
      ${WEEKDAY_OPTIONS.map((option) => `<option value="${option.value}">${option.label}</option>`).join('')}
    </select>
    <input class="schedule-start-time" type="time" step="60" aria-label="开始时间" />
    <span class="schedule-separator">-</span>
    <input class="schedule-end-time" type="time" step="60" aria-label="结束时间" />
    <button type="button" class="danger-ghost-btn schedule-remove-btn">删除</button>
  `;

  row.querySelector('.schedule-weekday').value = String(schedule.weekday || '1');
  row.querySelector('.schedule-start-time').value = String(schedule.start_time || '').slice(0, 5);
  row.querySelector('.schedule-end-time').value = String(schedule.end_time || '').slice(0, 5);
  scheduleList.appendChild(row);
}

function resetSchedules(schedules = []) {
  scheduleList.innerHTML = '';
  schedules.forEach((schedule) => renderScheduleRow(schedule));
}

function collectSchedules() {
  return Array.from(scheduleList.querySelectorAll('.schedule-row')).map((row) => ({
    weekday: Number(row.querySelector('.schedule-weekday').value),
    start_time: row.querySelector('.schedule-start-time').value,
    end_time: row.querySelector('.schedule-end-time').value
  }));
}

function ensureCourseTypeOption(value) {
  if (!value) return;
  const existing = Array.from(courseTypeSelect.options).find((option) => option.value === value);
  if (existing) return;
  const option = document.createElement('option');
  option.value = value;
  option.textContent = value;
  courseTypeSelect.insertBefore(option, courseTypeSelect.querySelector('option[value="__add_new__"]'));
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

  if (!Array.isArray(data.schedules)) {
    errors.schedules = '排课数据格式不正确';
    return errors;
  }

  const duplicateSet = new Set();
  data.schedules.forEach((schedule, index) => {
    if (!schedule.start_time || !schedule.end_time) {
      errors.schedules = `请填写完整的上课时间（第 ${index + 1} 条）`;
      return;
    }

    if (!schedule.weekday || schedule.weekday < 1 || schedule.weekday > 7) {
      errors.schedules = `上课周几无效（第 ${index + 1} 条）`;
      return;
    }

    if (schedule.start_time >= schedule.end_time) {
      errors.schedules = `开始时间需早于结束时间（第 ${index + 1} 条）`;
      return;
    }

    const key = `${schedule.weekday}-${schedule.start_time}-${schedule.end_time}`;
    if (duplicateSet.has(key)) {
      errors.schedules = '存在重复的上课时间';
      return;
    }
    duplicateSet.add(key);
  });

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

function validateRemarkForm(data) {
  const errors = {};
  if (typeof data.remark !== 'string') {
    errors.remark = '备注格式不正确';
  }
  if (String(data.remark || '').trim().length > 500) {
    errors.remark = '备注长度不能超过 500';
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

function showPage(page) {
  [listPage, detailPage, masterTimetablePage].forEach((node) => node.classList.remove('active'));
  page.classList.add('active');
}

function openListPage() {
  showPage(listPage);
  selectedStudentId = null;
}

async function openMasterTimetablePage() {
  showPage(masterTimetablePage);
  await loadMasterTimetable();
}

function openStudentDialog() {
  editingStudentId = null;
  studentForm.reset();
  studentForm.querySelector('h3').textContent = '录入学生';
  courseTypeSelect.value = '创想课';
  newCourseTypeRow.classList.add('hidden');
  newCourseTypeInput.value = '';
  resetSchedules();
  setErrors(studentForm, {});
  document.getElementById('student-form-server-error').textContent = '';
  studentDialog.showModal();
}

function openEditStudentDialog(student) {
  editingStudentId = Number(student.id);
  studentForm.reset();
  studentForm.querySelector('h3').textContent = '编辑学生';
  document.getElementById('name').value = student.name || '';
  document.getElementById('gender').value = student.gender || '';
  document.getElementById('age').value = student.age || '';
  ensureCourseTypeOption(student.course_type);
  document.getElementById('course_type').value = student.course_type || '创想课';
  document.getElementById('enroll_count').value = student.enroll_count || '';
  document.getElementById('total_amount').value = student.total_amount || '';
  newCourseTypeRow.classList.add('hidden');
  newCourseTypeInput.value = '';
  resetSchedules(student.schedules || []);
  setErrors(studentForm, {});
  document.getElementById('student-form-server-error').textContent = '';
  studentDialog.showModal();
}

async function openDetailPage(studentId) {
  selectedStudentId = Number(studentId);
  const json = await apiFetch(`/api/students/${selectedStudentId}`);
  const student = json.data;

  showPage(detailPage);

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
        <button type="button" id="detail-edit-schedules-btn" class="secondary">编辑排课</button>
        <button type="button" id="detail-remark-btn" class="secondary detail-remark-btn">备注</button>
      </div>
    </div>
    <div class="detail-schedules">
      <h3>上课时段</h3>
      ${(student.schedules || []).length
        ? `<div class="schedule-tags">${student.schedules.map((schedule) => `<span class="schedule-tag">${weekdayText(schedule.weekday)} ${formatScheduleTimeRange(schedule)}</span>`).join('')}</div>`
        : '<p class="schedule-empty">暂无排课</p>'}
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


function renderMasterTimetable() {
  if (!masterTimetable.length) {
    masterTimetableContainer.innerHTML = '<div class="empty">暂无排课数据</div>';
    return;
  }

  const byWeekday = new Map(WEEKDAY_VALUES.map((day) => [day, []]));
  masterTimetable.forEach((item) => {
    if (!byWeekday.has(Number(item.weekday))) {
      byWeekday.set(Number(item.weekday), []);
    }
    byWeekday.get(Number(item.weekday)).push(item);
  });

  masterTimetableContainer.innerHTML = WEEKDAY_VALUES.map((weekday) => {
    const cards = (byWeekday.get(weekday) || []).sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
    return `
      <section class="weekday-column">
        <h3>${weekdayText(weekday)}</h3>
        <div class="weekday-cards">
          ${cards.length ? cards.map((card) => `
            <article class="timetable-card">
              <p class="timetable-time">${escapeHtml(card.time_slot)}</p>
              <p class="timetable-count">人数：${card.student_count}</p>
              <ul class="timetable-students">
                ${card.students.map((student) => `<li>${escapeHtml(student.name)}</li>`).join('')}
              </ul>
              <button
                type="button"
                class="secondary timetable-checkin-btn"
                data-weekday="${card.weekday}"
                data-start-time="${escapeHtml(String(card.start_time || '').slice(0, 5))}"
                data-end-time="${escapeHtml(String(card.end_time || '').slice(0, 5))}"
              >批量签到</button>
              <p class="signed-today-placeholder">今日已签到：${card.today_checked_in || 0}人</p>
            </article>
          `).join('') : '<div class="empty">无时段</div>'}
        </div>
      </section>
    `;
  }).join('');
}


function validateBatchCheckinForm(data) {
  const errors = {};
  if (!data.session_date) errors.session_date = '上课日期为必填项';
  return errors;
}

async function openBatchCheckinDialog({ weekday, startTime, endTime }) {
  const json = await apiFetch(`/api/timetable/due-students?weekday=${weekday}&start_time=${startTime}&end_time=${endTime}`);
  const dueStudents = json.data || [];

  if (!dueStudents.length) {
    window.alert('当前时段暂无应到学生');
    return;
  }

  document.getElementById('batch-weekday').value = String(weekday);
  document.getElementById('batch-start-time').value = String(startTime);
  document.getElementById('batch-end-time').value = String(endTime);
  document.getElementById('batch-session-date').valueAsDate = new Date();
  document.getElementById('batch-class-content').value = '';
  setErrors(batchCheckinForm, {});
  document.getElementById('batch-checkin-form-server-error').textContent = '';

  batchStudentList.innerHTML = dueStudents.map((student) => `
    <label class="batch-student-item">
      <input type="checkbox" name="present_student_ids" value="${student.id}" checked />
      <span>${escapeHtml(student.name)}</span>
    </label>
  `).join('');

  batchCheckinDialog.showModal();
}

async function loadMasterTimetable() {
  const json = await apiFetch('/api/timetable/master');
  masterTimetable = json.data;
  renderMasterTimetable();
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
topMasterTimetableBtn.addEventListener('click', async () => openMasterTimetablePage());

cancelStudentBtn.addEventListener('click', () => studentDialog.close());
addScheduleBtn.addEventListener('click', () => renderScheduleRow());

scheduleList.addEventListener('click', (event) => {
  const removeBtn = event.target.closest('.schedule-remove-btn');
  if (!removeBtn) return;
  removeBtn.closest('.schedule-row')?.remove();
});

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
cancelBatchCheckinBtn.addEventListener('click', () => batchCheckinDialog.close());
cancelRenewBtn.addEventListener('click', () => renewDialog.close());
cancelRemarkBtn.addEventListener('click', () => remarkDialog.close());

studentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(studentForm).entries());
  data.schedules = collectSchedules();
  const errors = validateStudentForm(data);
  setErrors(studentForm, errors);
  if (Object.keys(errors).length) return;

  try {
    if (editingStudentId) {
      await apiFetch(`/api/students/${editingStudentId}`, { method: 'PUT', body: JSON.stringify(data) });
    } else {
      await apiFetch('/api/students', { method: 'POST', body: JSON.stringify(data) });
    }
    studentDialog.close();
    await loadStudents();
    if (editingStudentId) {
      await openDetailPage(editingStudentId);
    }
    editingStudentId = null;
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

  const remarkBtn = event.target.closest('#detail-remark-btn');
  if (remarkBtn && selectedStudentId) {
    const json = await apiFetch(`/api/students/${selectedStudentId}`);
    document.getElementById('remark-student-id').value = String(selectedStudentId);
    document.getElementById('remark-content').value = json.data.remark || '';
    setErrors(remarkForm, {});
    document.getElementById('remark-form-server-error').textContent = '';
    remarkDialog.showModal();
    return;
  }

  const editSchedulesBtn = event.target.closest('#detail-edit-schedules-btn');
  if (editSchedulesBtn && selectedStudentId) {
    const json = await apiFetch(`/api/students/${selectedStudentId}`);
    openEditStudentDialog(json.data);
  }

});



masterTimetableContainer.addEventListener('click', async (event) => {
  const checkinBtn = event.target.closest('.timetable-checkin-btn');
  if (!checkinBtn) return;

  try {
    await openBatchCheckinDialog({
      weekday: Number(checkinBtn.dataset.weekday),
      startTime: checkinBtn.dataset.startTime,
      endTime: checkinBtn.dataset.endTime
    });
  } catch (error) {
    window.alert(error.message || '打开批量签到失败');
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


batchCheckinForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(batchCheckinForm).entries());
  const errors = validateBatchCheckinForm(formData);
  setErrors(batchCheckinForm, errors);
  if (Object.keys(errors).length) return;

  const selectedIds = Array.from(batchCheckinForm.querySelectorAll('input[name="present_student_ids"]:checked')).map((node) => Number(node.value));

  const payload = {
    session_date: formData.session_date,
    weekday: Number(formData.weekday),
    start_time: `${formData.start_time}:00`,
    end_time: `${formData.end_time}:00`,
    present_student_ids: selectedIds,
    class_content: String(formData.class_content || '').trim()
  };

  try {
    const response = await apiFetch('/api/attendance/batch-check-in', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    batchCheckinDialog.close();
    await loadStudents();
    await loadMasterTimetable();
    window.alert(`批量签到完成：成功 ${response.data.success_count} 人，跳过 ${response.data.skipped.length} 人，失败 ${response.data.failed.length} 人`);
  } catch (error) {
    document.getElementById('batch-checkin-form-server-error').textContent = error.message || '批量签到失败';
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


remarkForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const studentId = Number(document.getElementById('remark-student-id').value);
  const formData = Object.fromEntries(new FormData(remarkForm).entries());
  const payload = {
    remark: String(formData.remark || '').trim()
  };

  const errors = validateRemarkForm(payload);
  setErrors(remarkForm, errors);
  if (Object.keys(errors).length) return;

  try {
    await apiFetch(`/api/students/${studentId}/remark`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    remarkDialog.close();
    await loadStudents();
    await openDetailPage(studentId);
  } catch (error) {
    document.getElementById('remark-form-server-error').textContent = error.message || '备注保存失败';
  }
});
