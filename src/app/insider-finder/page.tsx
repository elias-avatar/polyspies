"use client";

export default function InsiderFinderPage() {
  const HEADER_H = 200; // increased offset to fully hide upstream header
  return (
    <div className="p-0 m-0 w-screen h-screen relative">
      {/* Spacer so our page layout accounts for the hidden header area */}
      <div className="w-screen" style={{ height: HEADER_H }} />
      {/* Iframe shifted up so its header sits under our spacer */}
      <iframe
        src="https://app.polysights.xyz/insider-finder"
        className="block w-screen"
        style={{ border: 0, height: `calc(100vh + ${HEADER_H}px)`, marginTop: -HEADER_H }}
        loading="eager"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}


