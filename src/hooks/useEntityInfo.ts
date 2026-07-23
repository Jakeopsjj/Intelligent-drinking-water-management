/**
 * 联网获取水果/药物配图与介绍
 *
 * 使用场景：详情抽屉打开时，若该条目没有静态配图/介绍，
 * 自动通过维基百科 + 维基共享资源联网获取真实配图和介绍文本。
 *
 * 自定义水果/药物添加后无需手动填写，详情页会自动联网补全。
 *
 * 暴露完整字段：image / images / description / lead / sections / infobox
 * 详情页据此渲染维基百科完整词条（首段 + 章节段落 + 信息框 + 图集）。
 *
 * @param name 条目名称
 * @param kind 条目类型（'fruit' | 'medication'），影响搜索策略
 * @param staticImage 已有的静态配图（优先使用）
 * @param staticDescription 已有的静态介绍（优先使用）
 */

import { useState, useEffect } from 'react';
import { fetchEntityInfo, type EntityKind, type WikiSection } from '@/lib/wikiService';

export interface EntityInfoState {
  /** 最终使用的配图 URL（静态优先，否则联网获取） */
  image: string | undefined;
  /** 多张配图 URL（详情页图集，静态优先） */
  images: string[] | undefined;
  /** 最终使用的介绍（静态优先，否则联网获取）—— 兼容字段，前 200 字 */
  description: string | undefined;
  /** 维基百科完整首段（无标题的引言） */
  lead: string | undefined;
  /** 维基百科完整章节列表 */
  sections: WikiSection[] | undefined;
  /** 信息框键值对 */
  infobox: Record<string, string> | undefined;
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
  const [fetchedLead, setFetchedLead] = useState<string | undefined>(undefined);
  const [fetchedSections, setFetchedSections] = useState<WikiSection[] | undefined>(undefined);
  const [fetchedInfobox, setFetchedInfobox] = useState<Record<string, string> | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (staticImage && staticDescription) {
      setFetchedImage(undefined);
      setFetchedImages(undefined);
      setFetchedDesc(undefined);
      setFetchedLead(undefined);
      setFetchedSections(undefined);
      setFetchedInfobox(undefined);
      setLoading(false);
      return;
    }
    if (!name) {
      setFetchedImage(undefined);
      setFetchedImages(undefined);
      setFetchedDesc(undefined);
      setFetchedLead(undefined);
      setFetchedSections(undefined);
      setFetchedInfobox(undefined);
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
      setFetchedLead(info.lead);
      setFetchedSections(info.sections);
      setFetchedInfobox(info.infobox);
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
      const rest = fetchedImages?.filter((u) => u !== staticImage) ?? [];
      return [staticImage, ...rest].slice(0, 6);
    }
    return fetchedImages;
  })();

  return {
    image: staticImage || fetchedImage,
    images: combinedImages,
    description: staticDescription || fetchedDesc,
    lead: fetchedLead,
    sections: fetchedSections,
    infobox: fetchedInfobox,
    loading,
  };
}
