/**
 * 联网获取百科内容 hook
 *
 * 使用场景：药物/水果详情页打开时，自动通过百科服务获取
 * 词条摘要、正文、配图、信息框。全应用详情页统一数据源。
 *
 * 图片补全：内置数据（离线兜底）的 image 字段为空，命中内置数据后
 * 仍会异步联网获取配图（维基共享资源）补全，使内置词条也能显示真实图片。
 *
 * @param name 药物/水果名称
 */
import { useState, useEffect } from 'react';
import { fetchBaikeInfo, type BaikeInfo } from '@/lib/baikeService';
import { fetchEntityInfo } from '@/lib/wikiService';

export interface BaikeInfoState {
  info: BaikeInfo | null;
  loading: boolean;
}

/** 根据名称判断类型：含剂型后缀视为药物，否则按水果处理 */
function guessKind(name: string): 'fruit' | 'medication' {
  return /片|胶囊|注射液|口服液|缓释|控释|分散|颗粒|丸|膏|注射剂|滴剂|喷雾|贴剂|凝胶|乳膏/.test(name)
    ? 'medication'
    : 'fruit';
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
      .then(async (data) => {
        if (cancelled) return;
        setInfo(data);
        setLoading(false);
        // 图片补全：内置数据或联网数据无配图时，异步从维基共享资源获取真实图片
        if (data && !data.image) {
          try {
            const entity = await fetchEntityInfo(name, guessKind(name));
            if (cancelled) return;
            if (entity.image || (entity.images && entity.images.length)) {
              setInfo((prev) =>
                prev
                  ? {
                      ...prev,
                      image: entity.image || prev.image,
                      images: entity.images?.length ? entity.images : prev.images,
                    }
                  : prev
              );
            }
          } catch {
            // 图片补全失败不影响已有内容
          }
        }
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
