import { cloneElement, isValidElement, type ElementType, type ReactNode } from "react";
import { t } from "@/lib/copy";

interface CopyTransProps {
  i18nKey: string;
  components?: { strong?: ElementType | ReactNode };
}

/** Renders copy strings that include `<strong>...</strong>` markup. */
export function CopyTrans({ i18nKey, components }: CopyTransProps) {
  const strongComp = components?.strong;
  const text = t(i18nKey);
  const nodes: ReactNode[] = [];
  const re = /<strong>(.*?)<\/strong>/gi;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const key = match.index;
    const inner = match[1];
    if (isValidElement(strongComp)) {
      nodes.push(cloneElement(strongComp, { key }, inner));
    } else if (typeof strongComp === "string") {
      const Tag = strongComp as ElementType;
      nodes.push(<Tag key={key}>{inner}</Tag>);
    } else {
      nodes.push(<strong key={key}>{inner}</strong>);
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) nodes.push(text.slice(last));

  return <>{nodes}</>;
}
