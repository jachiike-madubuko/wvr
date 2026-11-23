import React, { useState, useMemo } from 'react';
import { SUBJECTS, WEEKS, SUBJECT_STANDARDS, STUDENTS } from '../data/pacingData.js';
import { computeSortedRoster, classifyDelta } from '../data/pacingEngine.js';
import '../styles/tokens.css';

export function StudentPacingSwimlanes({ initialStudents = STUDENTS, defaultTodayWeek = 3 }) {
  const [todayWeekIndex, setTodayWeekIndex] = useState(defaultTodayWeek);
  const [currentSubject, setCurrentSubject] = useState('overall');
  const [statusFilter, setStatusFilter] = useState('all');

  const { visible, counts } = useMemo(
    () => computeSortedRoster(initialStudents, currentSubject, todayWeekIndex, statusFilter),
    [initialStudents, currentSubject, todayWeekIndex, statusFilter]
  );

  const toggleStatusFilter = (status) => {
    setStatusFilter((prev) => (prev === status ? 'all' : status));
  };

  const standards = SUBJECT_STANDARDS[currentSubject];

  return (
    <section className="wv-pacing-container" aria-label="Individual Student Pacing Swimlanes">
      {/* Layer 4: Top Bar & Interactive Class Pulse Summary */}
      <header className="wv-topbar">
        <div>
          <h1>Individual Student Pacing</h1>
          <p>Common Core Continuous Lesson Plan · Sorted automatically by urgency</p>
        </div>

        <div className="wv-pulse-bar" role="group" aria-label="Class pace summary">
          {(['behind', 'on_track', 'ahead']).map((status) => {
            const label = status === 'behind' ? 'Behind' : status === 'on_track' ? 'On Track' : 'Ahead';
            return (
              <button
                key={status}
                type="button"
                data-testid={`pulse-pill-${status}`}
                aria-pressed={statusFilter === status}
                className={`wv-pulse-pill ${statusFilter === status ? 'is-active' : ''}`}
                onClick={() => toggleStatusFilter(status)}
              >
                <span className={`wv-dot wv-dot--${status}`} />
                {counts[status]} {label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Layer 4: Subject Filter Tabs & Today Reference Anchor */}
      <div className="wv-controls-row">
        <div role="tablist" aria-label="Subject slice filters" className="wv-subject-tabs">
          {SUBJECTS.map((subj) => (
            <button
              key={subj.id}
              type="button"
              role="tab"
              data-testid={`subject-tab-${subj.id}`}
              aria-selected={currentSubject === subj.id}
              className={`wv-subject-tab ${currentSubject === subj.id ? 'is-active' : ''}`}
              onClick={() => setCurrentSubject(subj.id)}
            >
              {subj.label}
            </button>
          ))}
        </div>

        <label className="wv-today-selector">
          <span>Calendar Today:</span>
          <select
            data-testid="today-week-select"
            value={todayWeekIndex}
            onChange={(e) => setTodayWeekIndex(Number(e.target.value))}
          >
            {WEEKS.slice(1, 5).map((wk) => (
              <option key={wk.index} value={wk.index}>
                {wk.label} ({wk.dateRange})
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Layer 3: Continuous Swimlane Grid */}
      <div className="wv-board" role="table" aria-label="Student pacing timeline">
        <div className="wv-grid-row wv-grid-header" role="row">
          <div className="wv-header-student-col" role="columnheader">
            <span>Student ({visible.length})</span>
            <span>{currentSubject === 'overall' ? 'Bottleneck status' : 'Subject pace'}</span>
          </div>
          {WEEKS.map((wk) => {
            const isToday = wk.index === todayWeekIndex;
            const offset = wk.index - todayWeekIndex;
            return (
              <div
                key={wk.index}
                role="columnheader"
                data-testid={`week-col-${wk.index}`}
                className={`wv-week-header ${isToday ? 'is-today' : ''}`}
                title={standards[wk.index]}
              >
                <span className="wv-week-offset">
                  {offset === 0 ? 'TODAY' : offset > 0 ? `+${offset}w` : `${offset}w`}
                </span>
                <span className="wv-week-title">{wk.label} · {wk.dateRange}</span>
                <span className="wv-week-standard">{standards[wk.index]}</span>
              </div>
            );
          })}
        </div>

        {visible.map((student) => (
          <div
            key={student.id}
            role="row"
            data-testid={`student-row-${student.id}`}
            className="wv-grid-row wv-student-row"
          >
            <div className="wv-student-cell" role="cell">
              <div className="wv-student-identity">
                <div
                  className="wv-avatar"
                  style={{ backgroundColor: student.avatarColor, color: student.avatarInk }}
                >
                  {student.initials}
                </div>
                <div>
                  <div className="wv-student-name">{student.name}</div>
                  <div className="wv-student-sub">
                    {student.delta < 0 ? `${student.delta}w Behind` : student.delta > 0 ? `+${student.delta}w Ahead` : 'On Track'}
                  </div>
                </div>
              </div>
              <span className={`wv-status-badge wv-status-badge--${student.status}`}>
                {student.delta < 0 ? `${student.delta}w Behind` : student.delta > 0 ? `+${student.delta}w Ahead` : 'On Track'}
              </span>
            </div>

            {WEEKS.map((wk) => {
              const isToday = wk.index === todayWeekIndex;
              const subjectsAtWeek = student.subjectsByWeek[wk.index] || [];
              return (
                <div
                  key={wk.index}
                  role="cell"
                  className={`wv-lane-cell ${isToday ? 'is-today' : ''}`}
                >
                  {currentSubject === 'overall'
                    ? subjectsAtWeek.map((subj) => (
                        <span
                          key={subj.id}
                          data-testid={`chip-${student.id}-${subj.id}`}
                          className={`wv-subject-chip wv-subject-chip--${subj.status}`}
                          title={`${subj.label}: ${SUBJECT_STANDARDS[subj.id][wk.index]}`}
                        >
                          {subj.short}
                        </span>
                      ))
                    : student.anchorWeek === wk.index && (
                        <span
                          data-testid={`pin-${student.id}-${currentSubject}`}
                          className={`wv-single-pin wv-single-pin--${student.status}`}
                        >
                          {SUBJECTS.find((s) => s.id === currentSubject)?.label}
                        </span>
                      )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
