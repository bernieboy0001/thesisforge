import { notFound } from "next/navigation";
import { ThesisWorkspace } from "@/components/ThesisWorkspace";
import { sodexConfig } from "@/lib/sodex";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ThesisPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ copy?: string }>;
}) {
  const { id } = await params;
  const thesis = await store.getThesis(id);
  if (!thesis) notFound();

  const { copy } = await searchParams;
  const cfg = sodexConfig();

  return (
    <ThesisWorkspace
      thesis={thesis}
      copyMode={copy === "1"}
      builder={{ id: cfg.builderId, fee: cfg.fee, network: cfg.network }}
    />
  );
}
