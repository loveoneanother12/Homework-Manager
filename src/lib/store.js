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
  const { data, error } = await supabase.from('hw_classes').select('*').order('created_at');
  if (error) throw error;
  return data ?? [];
}

export async function getClassByName(className) {
  const { data } = await supabase.from('hw_classes').select('*').eq('class_name', className).single();
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

export async function deleteClass(id) {
  // hw_class_students + hw_homework_records: ON DELETE CASCADE로 자동 정리
  const { error } = await supabase.from('hw_classes').delete().eq('id', id);
  if (error) throw error;
}

// ── 학생 ─────────────────────────────────────────────────────────────────────

export async function getStudents() {
  const { data, error } = await supabase.from('hw_students').select('*').order('name');
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
    .from('hw_students').select('*').in('id', ids).order('name');
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

export async function deleteStudent(id) {
  await supabase.from('hw_homework_records').delete().eq('student_id', id);
  await supabase.from('hw_class_students').delete().eq('student_id', id);
  const { error } = await supabase.from('hw_students').delete().eq('id', id);
  if (error) throw error;
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
  const { data, error } = await supabase
    .from('hw_class_students').select('class_id, student_id');
  if (error) throw error;
  return data ?? [];
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

export async function getRecordsByStudent(studentId, sessionDate = null, classId = null) {
  let q = supabase.from('hw_homework_records').select('*')
    .eq('student_id', studentId).order('created_at', { ascending: false });
  if (sessionDate) q = q.eq('session_date', sessionDate);
  if (classId) q = q.eq('class_id', classId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(withKpi);
}

export async function getLatestRecord(studentId) {
  const { data } = await supabase.from('hw_homework_records').select('*')
    .eq('student_id', studentId).order('created_at', { ascending: false }).limit(1).single();
  return data ? withKpi(data) : null;
}

export async function getPendingSecondRoundRecords(studentId, beforeDate, classId = null) {
  let q = supabase.from('hw_homework_records').select('*')
    .eq('student_id', studentId)
    .is('retry_total', null)
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
    .in('student_id', ids).order('created_at', { ascending: false });
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
  const { error } = await supabase.from('hw_homework_records').delete().eq('id', id);
  if (error) throw error;
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
