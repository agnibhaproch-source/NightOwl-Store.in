import { Logo } from './Decor';

export function BootScreen() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg">
      <div className="animate-pulse">
        <Logo size={56} withText={false} />
      </div>
    </div>
  );
}
