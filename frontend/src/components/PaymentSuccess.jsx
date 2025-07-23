<html>
  <head>
    <link rel="preconnect" href="https://fonts.gstatic.com/" crossorigin="" />
    <link
      rel="stylesheet"
      as="style"
      onload="this.rel='stylesheet'"
      href="https://fonts.googleapis.com/css2?display=swap&amp;family=Noto+Sans%3Awght%40400%3B500%3B700%3B900&amp;family=Plus+Jakarta+Sans%3Awght%40400%3B500%3B700%3B800"
    />

    <title>Stitch Design</title>
    <link rel="icon" type="image/x-icon" href="data:image/x-icon;base64," />

    <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
  </head>
  <body>
    <div class="relative flex size-full min-h-screen flex-col bg-[#f8fcf8] group/design-root overflow-x-hidden" style='font-family: "Plus Jakarta Sans", "Noto Sans", sans-serif;'>
      <div class="layout-container flex h-full grow flex-col">
        <header class="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#e7f3e7] px-10 py-3">
          <div class="flex items-center gap-4 text-[#0e1b0e]">
            <div class="size-4">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clip-path="url(#clip0_6_535)">
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M47.2426 24L24 47.2426L0.757355 24L24 0.757355L47.2426 24ZM12.2426 21H35.7574L24 9.24264L12.2426 21Z"
                    fill="currentColor"
                  ></path>
                </g>
                <defs>
                  <clipPath id="clip0_6_535"><rect width="48" height="48" fill="white"></rect></clipPath>
                </defs>
              </svg>
            </div>
            <h2 class="text-[#0e1b0e] text-lg font-bold leading-tight tracking-[-0.015em]">Roamio</h2>
          </div>
        </header>
        <div class="px-40 flex flex-1 justify-center py-5">
          <div class="layout-content-container flex flex-col w-[512px] max-w-[512px] py-5 max-w-[960px] flex-1">
            <div class="w-full" style="height: 100px;"></div>
            <h2 class="text-[#0e1b0e] tracking-light text-[28px] font-bold leading-tight px-4 text-center pb-3 pt-5">You’re now a Roamio+ adventurer!</h2>
            <div class="flex w-full grow bg-[#f8fcf8] @container p-4">
              <div class="w-full gap-1 overflow-hidden bg-[#f8fcf8] @[480px]:gap-2 aspect-[3/2] rounded-xl flex">
                <div
                  class="w-full bg-center bg-no-repeat bg-cover aspect-auto rounded-none flex-1"
                  style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuDB8I3wAn19uYjTtcyBVa9_6D-r20Hv3Aq44hTQhjK2z3BnyKzGfJQ3-HPmsL6-PsuXP0Q55DV5GVK_qbZBgjP6Mn555llo2vKxZSzlTD9G8V21PGwE5hgElfQzebXjl2N0LJWuRndhXOVuAHA93FoaPwj_ldZN6CAPaGoXl3b6X41w7Wgi53WcV3sa7-TT_udCujXcv15RfVV4XxzIqH8BT9QTFrDDboZT5LKEcxtxKj8clAQI9uaOYsAEErxtU9LMUVCbH4LQoJA");'
                ></div>
              </div>
            </div>
            <div class="flex px-4 py-3 justify-center">
              <button
                class="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-4 bg-[#14b714] text-[#f8fcf8] text-sm font-bold leading-normal tracking-[0.015em]"
              >
                <span class="truncate">Return to Profile</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
