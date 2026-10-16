import mark from "@/assets/logo-mark.svg";
import wordmark from "@/assets/logo-wordmark.svg";

export function LogoMark({ className }: { className?: string }) {
  return <img src={mark} alt="" aria-hidden className={className} />;
}

export function Wordmark({ className }: { className?: string }) {
  return <img src={wordmark} alt="LinguaRoots" className={className} />;
}
