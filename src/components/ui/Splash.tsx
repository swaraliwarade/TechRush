export function Splash({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center p-8">
      <div className="flex flex-col items-center gap-5">
        <span className="logo-pulse grid size-16 place-items-center overflow-hidden rounded-2xl sm:size-20">
          <img
            src="/trustpass-logo.png"
            alt="TrustPass logo"
            width={512}
            height={512}
            className="size-full object-cover"
          />
        </span>
        <p className="text-sm text-mist-400">{message}</p>
      </div>
    </div>
  )
}
