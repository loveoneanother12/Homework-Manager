// Supabase 기반 데이터 스토어 — 모든 함수 async

import { supabase } from './supabase.js';
import { calcFirst, calcSecond } from './kpi.js';
import { DEFAULT_SENTENCES } from './sentences.js';

function withKpi(record) {
  if (!record) return null;
  const kpi1 = calcFirst({
    total_count:     record.total_count,
    not_attempted:   record.not_attempted,
    gave_up:         record.gave_up,
    wrong_attempted: record.wrong_attempted,
  });
  const kpi2 = record.retry_total != null
    ? calcSecond(
        { retry_total: record.retry_total, retry_correct: record.retry_correct,
          retry_wrong: record.retry_wrong, retry_gave_up: record.retry_gave_up },
        kpi1.first_wrongs,
      )
    : null;
  return { ...record, _kpi1: kpi1, _kpi2: kpi2 };
}

// ── 반 ───────────────────────────────────────────────────────────────────────

export async function getClasses() {
  const { data, error } = await supabase.from('hw_classes').select('*')
    .is('deleted_at', null).order('created_at');
  if (error) throw error;
  return data ?? [];
}

export async function getClassByName(className) {
  const { data } = await supabase.from('hw_classes').select('*')
    .eq('class_name', className).is('deleted_at', null).single();
  return data ?? null;
}

export async function addClass(data) {
  const { data: c, error } = await supabase.from('hw_classes').insert(data).select().single();
  if (error) throw error;
  return c;
}

export async function updateClass(id, updates) {
  const { error } = await supabase.from('hw_classes').update(updates).eq('id', id);
  if (error) throw error;
}

// soft delete — 반과 그 반의 채점 기록을 같은 시각으로 휴지통 이동.
// 복원 시 deleted_at이 일치하는 기록만 함께 살아난다 (개별 삭제된 기록과 구분).
export async function deleteClass(id) {
  const ts = new Date().toISOString();
  const { error: e1 } = await supabase.from('hw_homework_records')
    .update({ deleted_at: ts }).eq('class_id', id).is('deleted_at', null);
  if (e1) throw e1;
  const { error } = await supabase.from('hw_classes').update({ deleted_at: ts }).eq('id', id);
  if (error) throw error;
}

export async function restoreClass(cls, newName = null) {
  const { error: e1 } = await supabase.from('hw_homework_records')
    .update({ deleted_at: null }).eq('class_id', cls.id).eq('deleted_at', cls.deleted_at);
  if (e1) throw e1;
  const updates = { deleted_at: null };
  if (newName) updates.class_name = newName;
  const { error } = await supabase.from('hw_classes').update(updates).eq('id', cls.id);
  if (error) throw error;
}

export async function classNameExists(name) {
  const { count, error } = await supabase.from('hw_classes')
    .select('*', { count: 'exact', head: true })
    .eq('class_name', name).is('deleted_at', null);
  if (error) throw error;
  return (count ?? 0) > 0;
}

// ── 학생 ─────────────────────────────────────────────────────────────────────

export async function getStudents() {
  const { data, error } = await supabase.from('hw_students').select('*')
    .is('deleted_at', null).order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getStudentsByClass(className) {
  const cls = await getClassByName(className);
  if (!cls) return [];
  return getStudentsByClassId(cls.id);
}

export async function getStudentsByClassId(classId) {
  const { data: members, error: e1 } = await supabase
    .from('hw_class_students').select('student_id').eq('class_id', classId);
  if (e1) throw e1;
  if (!members?.length) return [];
  const ids = members.map(m => m.student_id);
  const { data, error: e2 } = await supabase
    .from('hw_students').select('*').in('id', ids).is('deleted_at', null).order('name');
  if (e2) throw e2;
  return data ?? [];
}

export async function getStudent(id) {
  const { data } = await supabase.from('hw_students').select('*').eq('id', id).single();
  return data ?? null;
}

export async function addStudent(data) {
  const { data: s, error } = await supabase.from('hw_students').insert(data).select().single();
  if (error) throw error;
  return s;
}

export async function updateStudent(id, updates) {
  const { data: s, error } = await supabase.from('hw_students').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return s;
}

// soft delete — 학생과 그 학생의 채점 기록을 같은 시각으로 휴지통 이동.
// 반 소속(hw_class_students)은 그대로 두어 복원 시 원래 반에 다시 나타난다.
export async function deleteStudent(id) {
  const ts = new Date().toISOString();
  const { error: e1 } = await supabase.from('hw_homework_records')
    .update({ deleted_at: ts }).eq('student_id', id).is('deleted_at', null);
  if (e1) throw e1;
  const { error } = await supabase.from('hw_students').update({ deleted_at: ts }).eq('id', id);
  if (error) throw error;
}

export async function restoreStudent(student, newName = null) {
  const { error: e1 } = await supabase.from('hw_homework_records')
    .update({ deleted_at: null }).eq('student_id', student.id).eq('deleted_at', student.deleted_at);
  if (e1) throw e1;
  const updates = { deleted_at: null };
  if (newName) updates.name = newName;
  const { error } = await supabase.from('hw_students').update(updates).eq('id', student.id);
  if (error) throw error;
}

export async function studentNameExists(name) {
  const { count, error } = await supabase.from('hw_students')
    .select('*', { count: 'exact', head: true })
    .eq('name', name).is('deleted_at', null);
  if (error) throw error;
  return (count ?? 0) > 0;
}

// ── 반-학생 연결 (N:M) ───────────────────────────────────────────────────────

export async function addStudentToClass(classId, studentId) {
  const { error } = await supabase
    .from('hw_class_students').insert({ class_id: classId, student_id: studentId });
  if (error) throw error;
}

export async function removeStudentFromClass(classId, studentId) {
  const { error } = await supabase.from('hw_class_students').delete()
    .eq('class_id', classId).eq('student_id', studentId);
  if (error) throw error;
}

export async function getAllClassMemberships() {
  // 휴지통에 있는 학생의 소속은 카운트에서 제외 (행 자체는 복원 대비 유지)
  const { data, error } = await supabase
    .from('hw_class_students')
    .select('class_id, student_id, hw_students!inner(deleted_at)')
    .is('hw_students.deleted_at', null);
  if (error) throw error;
  return (data ?? []).map(({ class_id, student_id }) => ({ class_id, student_id }));
}

// ── 단원 프리셋 ───────────────────────────────────────────────────────────────

export async function getUnits() {
  const { data, error } = await supabase.from('hw_unit_presets').select('*')
    .order('sort_order').order('created_at');
  if (error) throw error;
  return data ?? [];
}

export async function getUnit(id) {
  if (!id) return null;
  const { data } = await supabase.from('hw_unit_presets').select('*').eq('id', id).single();
  return data ?? null;
}

export async function addUnit(data) {
  const { data: u, error } = await supabase.from('hw_unit_presets').insert(data).select().single();
  if (error) throw error;
  return u;
}

export async function updateUnit(id, data) {
  const { error } = await supabase.from('hw_unit_presets').update(data).eq('id', id);
  if (error) throw error;
}

export async function deleteUnit(id) {
  const { error } = await supabase.from('hw_unit_presets').delete().eq('id', id);
  if (error) throw error;
}

// ── 채점 기록 ─────────────────────────────────────────────────────────────────

export async function countRecordsByStudent(studentId) {
  const { count, error } = await supabase.from('hw_homework_records')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId).is('deleted_at', null);
  if (error) throw error;
  return count ?? 0;
}

export async function countRecordsByClass(classId) {
  const { count, error } = await supabase.from('hw_homework_records')
    .select('*', { count: 'exact', head: true })
    .eq('class_id', classId).is('deleted_at', null);
  if (error) throw error;
  return count ?? 0;
}

export async function getRecordsByStudent(studentId, sessionDate = null, classId = null) {
  let q = supabase.from('hw_homework_records').select('*')
    .eq('student_id', studentId).is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (sessionDate) q = q.eq('session_date', sessionDate);
  if (classId) q = q.eq('class_id', classId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(withKpi);
}

export async function getLatestRecord(studentId) {
  const { data } = await supabase.from('hw_homework_records').select('*')
    .eq('student_id', studentId).is('deleted_at', null)
    .order('created_at', { ascending: false }).limit(1).single();
  return data ? withKpi(data) : null;
}

// 당일 2차 채점이 완료된 이전 회차 레코드 (second_session_date = 오늘)
export async function getSecondRoundsByDate(studentIds, secondSessionDate, classId = null) {
  if (!studentIds.length) return [];
  let q = supabase.from('hw_homework_records').select('*')
    .in('student_id', studentIds)
    .eq('second_session_date', secondSessionDate)
    .not('retry_total', 'is', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (classId) q = q.eq('class_id', classId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(withKpi);
}

export async function getPendingSecondRoundRecords(studentId, beforeDate, classId = null) {
  let q = supabase.from('hw_homework_records').select('*')
    .eq('student_id', studentId)
    .is('retry_total', null)
    .is('deleted_at', null)
    .lt('session_date', beforeDate)
    .order('session_date', { ascending: false });
  if (classId) q = q.eq('class_id', classId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(withKpi);
}

export async function getRecordsByStudentIds(ids, sessionDate = null, classId = null) {
  if (!ids.length) return [];
  let q = supabase.from('hw_homework_records').select('*')
    .in('student_id', ids).is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (sessionDate) q = q.eq('session_date', sessionDate);
  if (classId) q = q.eq('class_id', classId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(withKpi);
}

export async function getRecordsByClass(className, sessionDate = null) {
  const cls = await getClassByName(className);
  if (!cls) return [];
  const students = await getStudentsByClassId(cls.id);
  if (!students.length) return [];
  const records = await getRecordsByStudentIds(students.map(s => s.id), sessionDate, cls.id);
  const byStudent = {};
  for (const r of records) {
    if (!byStudent[r.student_id]) byStudent[r.student_id] = r;
  }
  return Object.values(byStudent);
}

export async function addRecord(data) {
  const { _kpi1, _kpi2, ...rest } = data;
  const { data: r, error } = await supabase.from('hw_homework_records').insert(rest).select().single();
  if (error) throw error;
  return withKpi(r);
}

export async function updateRecord(id, data) {
  const { _kpi1, _kpi2, ...rest } = data;
  const { error } = await supabase.from('hw_homework_records').update(rest).eq('id', id);
  if (error) throw error;
}

export async function updateRecordComment(id, manual_comment) {
  return updateRecord(id, { manual_comment });
}

export async function updateRecordComment2(id, manual_comment_2) {
  return updateRecord(id, { manual_comment_2 });
}

export async function deleteRecord(id) {
  const { error } = await supabase.from('hw_homework_records')
    .update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function restoreRecord(id) {
  const { error } = await supabase.from('hw_homework_records')
    .update({ deleted_at: null }).eq('id', id);
  if (error) throw error;
}

// 같은 학생·날짜·반에 살아있는 기록이 있으면 복원 시 충돌
export async function recordConflictExists(record) {
  let q = supabase.from('hw_homework_records')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', record.student_id)
    .eq('session_date', record.session_date)
    .is('deleted_at', null);
  q = record.class_id ? q.eq('class_id', record.class_id) : q.is('class_id', null);
  const { count, error } = await q;
  if (error) throw error;
  return (count ?? 0) > 0;
}

// ── 휴지통 ────────────────────────────────────────────────────────────────────

export async function getDeletedClasses() {
  const { data, error } = await supabase.from('hw_classes').select('*')
    .not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getDeletedStudents() {
  const { data, error } = await supabase.from('hw_students').select('*')
    .not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getDeletedRecords() {
  const { data, error } = await supabase.from('hw_homework_records').select('*')
    .not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(withKpi);
}

// 휴지통 표시용 — 삭제된 반/학생 포함 전체 (이름 조회 맵 구성)
export async function getAllClassesIncludingDeleted() {
  const { data, error } = await supabase.from('hw_classes').select('*').order('created_at');
  if (error) throw error;
  return data ?? [];
}

export async function getAllStudentsIncludingDeleted() {
  const { data, error } = await supabase.from('hw_students').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

// ── 문장 풀 ───────────────────────────────────────────────────────────────────

export async function getSentences() {
  const { data, error } = await supabase.from('hw_sentence_blocks').select('*')
    .order('part').order('condition_key');
  if (error || !data?.length) return DEFAULT_SENTENCES;
  return data;
}

export async function updateSentence(id, data) {
  const { error } = await supabase.from('hw_sentence_blocks')
    .update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function addSentence(data) {
  const s = { id: crypto.randomUUID(), is_active: true, updated_at: new Date().toISOString(), ...data };
  const { data: result, error } = await supabase.from('hw_sentence_blocks').insert(s).select().single();
  if (error) throw error;
  return result;
}

export async function deleteSentence(id) {
  const { error } = await supabase.from('hw_sentence_blocks').delete().eq('id', id);
  if (error) throw error;
}

export async function resetSentencesToDefault() {
  await supabase.from('hw_sentence_blocks').delete().not('id', 'is', null);
  const seeds = DEFAULT_SENTENCES.map(s => ({ ...s, updated_at: new Date().toISOString() }));
  const { error } = await supabase.from('hw_sentence_blocks').insert(seeds);
  if (error) throw error;
}
