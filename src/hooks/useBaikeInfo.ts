/**
 * 联网获取百度百科内容 hook
 *
 * 使用场景：药物详情页打开时，自动通过百度百科联网获取
 * 词条摘要、正文、配图、信息框。全应用药物详情页统一数据源。
 *
 * @param name 药物名称
 */
import { useState, useEffect } from 'react';
import { fetchBaikeInfo, type BaikeInfo } from '@/lib/baikeService';

export interface BaikeInfoState {
  info: BaikeInfo | null;
  loading: boolean;
}

export function useBaikeInfo(name: string): BaikeInfoState {
  const [info, setInfo] = useState<BaikeInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!name) {
      setInfo(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchBaikeInfo(name)
      .then((data) => {
        if (cancelled) return;
        setInfo(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setInfo(null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [name]);

  return { info, loading };
}
