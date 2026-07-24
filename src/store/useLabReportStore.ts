/**
 * 化验报告 Store
 *
 * 管理透析患者历次血液化验报告记录。
 * 支持新增、编辑、删除报告，按时间排序查询，以及获取特定指标的趋势数据。
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LabReport, LabMetricKey } from '@/types';
import { generateId } from '@/utils/calc';
import { nativeJSONStorage } from '@/lib/nativeStorage';

interface LabReportState {
  reports: LabReport[];
  addReport: (report: Omit<LabReport, 'id' | 'createdAt'>) => string;
  updateReport: (id: string, updates: Partial<LabReport>) => void;
  deleteReport: (id: string) => void;
  getReportById: (id: string) => LabReport | undefined;
  /** 获取指定指标的历史趋势数据（按日期升序） */
  getMetricTrend: (key: LabMetricKey) => { date: number; value: number }[];
}

export const useLabReportStore = create<LabReportState>()(
  persist(
    (set, get) => ({
      reports: [],

      addReport: (report) => {
        const newReport: LabReport = {
          ...report,
          id: `lab-${generateId()}`,
          createdAt: Date.now(),
        };
        set((state) => ({
          reports: [...state.reports, newReport].sort((a, b) => a.date - b.date),
        }));
        return newReport.id;
      },

      updateReport: (id, updates) => {
        set((state) => ({
          reports: state.reports
            .map((r) => (r.id === id ? { ...r, ...updates } : r))
            .sort((a, b) => a.date - b.date),
        }));
      },

      deleteReport: (id) => {
        set((state) => ({
          reports: state.reports.filter((r) => r.id !== id),
        }));
      },

      getReportById: (id) => get().reports.find((r) => r.id === id),

      getMetricTrend: (key) => {
        return get().reports
          .filter((r) => r.metrics.some((m) => m.key === key))
          .map((r) => ({
            date: r.date,
            value: r.metrics.find((m) => m.key === key)!.value,
          }))
          .sort((a, b) => a.date - b.date);
      },
    }),
    {
      name: 'dialysis_lab_reports',
      storage: nativeJSONStorage,
    }
  )
);
