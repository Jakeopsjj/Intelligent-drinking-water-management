/**
 * 联网获取水果/药物配图与介绍
 *
 * 使用场景：详情抽屉打开时，若该条目没有静态配图/介绍，
 * 自动通过维基百科 + 维基共享资源联网获取真实配图和介绍文本。
 *
 * 自定义水果/药物添加后无需手动填写，详情页会自动联网补全。
 *
 * @param name 条目名称
 * @param kind 条目类型（'fruit' | 'medication'），影响搜索策略
 * @param staticImage 已有的静态配图（优先使用）
 * @param staticDescription 已有的静态介绍（优先使用）
 */

import { useState, useEffect } from 'react';
import { fetchEntityInfo, type EntityKind } from '@/lib/wikiService';

export interface EntityInfoState {
  /** 最终使用的配图 URL（静态优先，否则联网获取） */
  image: string | undefined;
  /** 多张配图 URL（药物详情页展示多张药盒图，静态优先） */
  images: string[] | undefined;
  /** 最终使用的介绍（静态优先，否则联网获取） */
  description: string | undefined;
  /** 是否正在联网获取中 */
  loading: boolean;
}

export function useEntityInfo(
  name: string,
  kind: EntityKind,
  staticImage?: string,
  staticDescription?: string
): EntityInfoState {
  const [fetchedImage, setFetchedImage] = useState<string | undefined>(undefined);
  const [fetchedImages, setFetchedImages] = useState<string[] | undefined>(undefined);
  const [fetchedDesc, setFetchedDesc] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (staticImage && staticDescription) {
      setFetchedImage(undefined);
      setFetchedImages(undefined);
      setFetchedDesc(undefined);
      setLoading(false);
      return;
    }
    if (!name) {
      setFetchedImage(undefined);
      setFetchedImages(undefined);
      setFetchedDesc(undefined);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchEntityInfo(name, kind).then((info) => {
      if (cancelled) return;
      setFetchedImage(info.image);
      setFetchedImages(info.images);
      setFetchedDesc(info.description);
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [name, kind, staticImage, staticDescription]);

  // 如果有静态图片，它作为封面，联网获取的图片补充在后面
  const combinedImages = (() => {
    if (staticImage) {
      // 静态图片优先作为封面
      const rest = fetchedImages?.filter((u) => u !== staticImage) ?? [];
      return [staticImage, ...rest].slice(0, 5);
    }
    return fetchedImages;
  })();

  return {
    image: staticImage || fetchedImage,
    images: combinedImages,
    description: staticDescription || fetchedDesc,
    loading,
  };
}
