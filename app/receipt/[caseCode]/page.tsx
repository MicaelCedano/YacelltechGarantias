import { redirect } from "next/navigation";

interface ReceiptPageProps {
  params: {
    caseCode: string;
  };
}

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  redirect(`/receipt?cases=${params.caseCode.toUpperCase()}`);
}
