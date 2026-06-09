// Supabase 기반 데이터 스토어 — 모든 함수 async

import { supabase } from './supabase.js';
import { calcFirst, calcSecond } from './kpi.js';
import { DEFAULT_SENTENCES } from './sentences.js';

// DB에는 _kpi1/_kpi2를 저장하지 않고, 로드 시 raw 값으로 재계산
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

export async function addClass(data) {
  const { data: c, error } = await supabase.from('hw_classes').insert(data).select().single();
  if (error) throw error;
  return c;
}

export async function updateClass(id, updates) {
  if (updates.class_name) {
    const { data: existing } = await supabase.from('hw_classes').select('class_name').eq('id', id).single();
    if (existing && existing.class_name !== updates.class_name) {
      await supabase.from('hw_students').update({ class_name: updates.class_name }).eq('class_name', existing.class_name);
    }
  }
  const { error } = await supabase.from('hw_classes').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteClass(id) {
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
  const { data, error } = await supabase.from('hw_students').select('*')
    .eq('class_name', className).order('name');
  if (error) throw error;
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
  const { error } = await supabase.from('hw_students').delete().eq('id', id);
  if (error) throw error;
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

export async function getRecordsByStudent(studentId, sessionDate = null) {
  let q = supabase.from('hw_homework_records').select('*')
    .eq('student_id', studentId).order('created_at', { ascending: false });
  if (sessionDate) q = q.eq('session_date', sessionDate);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(withKpi);
}

export async function getLatestRecord(studentId) {
  const { data } = await supabase.from('hw_homework_records').select('*')
    .eq('student_id', studentId).order('created_at', { ascending: false }).limit(1).single();
  return data ? withKpi(data) : null;
}

// 반 전체 학생의 레코드를 한 번에 가져옴 (N+1 방지)
export async function getRecordsByStudentIds(ids, sessionDate = null) {
  if (!ids.length) return [];
  let q = supabase.from('hw_homework_records').select('*')
    .in('student_id', ids).order('created_at', { ascending: false });
  if (sessionDate) q = q.eq('session_date', sessionDate);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(withKpi);
}

export async function getRecordsByClass(className, sessionDate = null) {
  const students = await getStudentsByClass(className);
  if (!students.length) return [];
  const records = await getRecordsByStudentIds(students.map(s => s.id), sessionDate);
  // student_id별 최신 레코드만 (PDF·미리보기용)
  const byStudent = {};
  for (const r of records) {
    if (!byStudent[r.student_id]) byStudent[r.student_id] = r; // already sorted desc
  }
  return Object.values(byStudent);
}

// 1차 채점 신규 저장
export async function addRecord(data) {
  const { _kpi1, _kpi2, ...rest } = data; // 계산값은 DB에 저장하지 않음
  const { data: r, error } = await supabase.from('hw_homework_records').insert(rest).select().single();
  if (error) throw error;
  return withKpi(r);
}

// 기존 레코드 업데이트 (2차 채점 추가 등)
export async function updateRecord(id, data) {
  const { _kpi1, _kpi2, ...rest } = data;
  const { error } = await supabase.from('hw_homework_records').update(rest).eq('id', id);
  if (error) throw error;
}

export async function updateRecordComment(id, manual_comment) {
  return updateRecord(id, { manual_comment });
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
