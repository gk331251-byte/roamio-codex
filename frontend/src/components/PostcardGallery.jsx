import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { auth, db } from '../firebase';

const PostcardGallery = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cards, setCards] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (!user) {
        setCards([]);
        setLoading(false);
        return;
      }
      try {
        const ref = collection(db, 'user_quests', user.uid);
        const q = query(ref, where('postcardUrl', '!=', null));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCards(data);
      } catch (err) {
        console.error('Failed to load postcards', err);
        setError('Failed to load postcards');
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <p className="p-4">Loading postcards...</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;
  if (cards.length === 0) return <p className="p-4">No postcards yet.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {cards.map(card => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white shadow-md rounded-xl overflow-hidden border border-[#e6f4ef] hover:shadow-lg"
        >
          <div
            className="h-40 bg-cover bg-center"
            style={{ backgroundImage: `url(${card.postcardUrl || card.imageUrl || 'https://placehold.co/600x300'})` }}
          />
          <div className="p-4 space-y-1">
            <h2 className="text-lg font-bold font-serif">{card.questData?.title || card.title || 'Quest'}</h2>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
              {card.questData?.difficulty || card.difficulty || 'easy'}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default PostcardGallery;
=======
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
    <div class="relative flex size-full min-h-screen flex-col bg-[#f9fbf9] group/design-root overflow-x-hidden" style='font-family: "Plus Jakarta Sans", "Noto Sans", sans-serif;'>
      <div class="layout-container flex h-full grow flex-col">
        <div class="px-40 flex flex-1 justify-center py-5">
          <div class="layout-content-container flex flex-col max-w-[960px] flex-1">
            <div class="flex flex-wrap justify-between gap-3 p-4"><p class="text-[#111811] tracking-light text-[32px] font-bold leading-tight min-w-72">Completed Quests</p></div>
            <div class="grid grid-cols-[repeat(auto-fit,minmax(158px,1fr))] gap-3 p-4">
              <div class="flex flex-col gap-3 pb-3">
                <div
                  class="w-full bg-center bg-no-repeat aspect-[3/4] bg-cover rounded-xl"
                  style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuAFOsjb4la3cgYFoCayPq6_w6RnHjEKgpwKsQfL3rAJ7d9m_q7piNxiHxEH911GhFdqWJNOFT4sMjnR6hpFikSLYaxzWHyyMsncIiiW8fZLdQ1bb2Bm7Vr-1xixfpJvynWhGo9t2aS6UMxL6FiA643So53-JqrCHRkpZiOB3G-SmcAotpTpxevuEYWdydIifoBBEYvUTCXChYLI9CvWA4mmiZujGvz27Z4GzIJi18zf9GatUDC7CrvcQVHgHL51vVnIurEnsbfB8Zk");'
                ></div>
                <div>
                  <p class="text-[#111811] text-base font-medium leading-normal">Explore the Historic Streets of Paris</p>
                  <p class="text-[#608560] text-sm font-normal leading-normal">Paris, France</p>
                </div>
              </div>
              <div class="flex flex-col gap-3 pb-3">
                <div
                  class="w-full bg-center bg-no-repeat aspect-[3/4] bg-cover rounded-xl"
                  style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuAIUaaOHuir_y90QSi3tVbXQQGLTFvW9Jqqy7MfDY_eKln-Y9LWic-707V5RXxBX0_dZZkWE6vVZjkC9r0DNdWQDVxp49HYupLGdes1Wt3igdEBssp2oTSTYN_W_g_9FxbQa7-nLF9l5LippRysaCpS3et82WE_boynpBWyhfhb3chxy-BpOEKGgsMOXatYZaxvyLMvA2VQsmpruVL3CkUzo0EICiidjOf38FkVaflk1mZYNikLTNgQObD_13gTQpqPIMgpGXiGsLU");'
                ></div>
                <div>
                  <p class="text-[#111811] text-base font-medium leading-normal">Discover the Hidden Gems of Tokyo</p>
                  <p class="text-[#608560] text-sm font-normal leading-normal">Tokyo, Japan</p>
                </div>
              </div>
              <div class="flex flex-col gap-3 pb-3">
                <div
                  class="w-full bg-center bg-no-repeat aspect-[3/4] bg-cover rounded-xl"
                  style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuA81qnl3xo7afZsPoPPvuwwGaiuI2ALpZa04NLqrKqjaNt770NNGzeSAsyWMMj_hEDIflo5GJBVcTuhUJfokmwDB9nEaQDQFaCghTBZ49RM7k1dxJ9DfEAIIqV6njQo3kdV3dIhmO_-W8r_c21x-IuuWk-vEr1PJF9LEwULCG1ZoPVaQM2Rkl862RVID1DAbc76pKg2T0fGepHup1LCsSrV-WH8ZLifvjK13qzkLUJJX1Z9SylgLsDPbi8pxbNS6D0ln42Y_UjtoYg");'
                ></div>
                <div>
                  <p class="text-[#111811] text-base font-medium leading-normal">Hike the Majestic Trails of the Rockies</p>
                  <p class="text-[#608560] text-sm font-normal leading-normal">Rocky Mountains, USA</p>
                </div>
              </div>
              <div class="flex flex-col gap-3 pb-3">
                <div
                  class="w-full bg-center bg-no-repeat aspect-[3/4] bg-cover rounded-xl"
                  style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuB5JouGF3HIw0anFdCR-KNpbuZLc9oMN8tKc0Hk4CL4vMzxjXc82O4wiNK5WV1NOFyxkeBeQLWGnNt8YGwdTe-iJtAxE1pYd7avOOa4ng_zZ5WxPE9K6thXlB_lkuTZ2CSI1APGvP4QpUSv24Vypjfb1JU1p5_4039keZd8lqr4aj_I-t6IHWqyIwMacWGsXgqwCFTNEZSeppstzLWQyx89F2Vvds3VdlAh7H4tHvLQWgJHTqUtMFNRdSnw8QJoccs1pIKNgC0OirY");'
                ></div>
                <div>
                  <p class="text-[#111811] text-base font-medium leading-normal">Uncover the Ancient Mysteries of Rome</p>
                  <p class="text-[#608560] text-sm font-normal leading-normal">Rome, Italy</p>
                </div>
              </div>
              <div class="flex flex-col gap-3 pb-3">
                <div
                  class="w-full bg-center bg-no-repeat aspect-[3/4] bg-cover rounded-xl"
                  style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuCb0HCBfgPP_iubA75ocTSkum4yeMfRHK9nbhKTiQj2PKll6LrHTRSzIi6nUdjFbOCYxSOCKUO9J31sg3BbR-NHiANvUP08F5fsiS8N2E_IU8eO9jINCDkl2HLAnTaKJ7SgV9G3bVvQEQnnSADGiPzxfcFjM_xCTF21jFW48Ck5mnx0mY2xKRIQeNvQTxSJ5ChQ-sn3nd5pXa15TXCf0goB3W8vkI7Zhen31wxO86cZJhd2UGIJUBgrZmBawYfkJI2--wzw6WHSNvc");'
                ></div>
                <div>
                  <p class="text-[#111811] text-base font-medium leading-normal">Experience the Vibrant Culture of Rio</p>
                  <p class="text-[#608560] text-sm font-normal leading-normal">Rio de Janeiro, Brazil</p>
                </div>
              </div>
              <div class="flex flex-col gap-3 pb-3">
                <div
                  class="w-full bg-center bg-no-repeat aspect-[3/4] bg-cover rounded-xl"
                  style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuDImdFVianWVnYNbf1Ic1ihN77erxJ8upStyrhU75LpkojzVB6H2JrLsfn-XurKOaofnJeDnaF2ZKDYYrDCgHmgHKxALGvOM7eIKYu62cWyByCmTeIhdWxkkmQIHD3w4F1uRCsZyATZg_dHtACGdH9mfljUTG-RGglUzgezRM4TshEsEQNdTcg8MhHpNUKboj2aAMkSse8_-vMXTLm_1Xiwj3-48MbVfz8KlBdgNxGlggaCunS8YfvY_3F1jjStMpLVXBV79m2-y0Q");'
                ></div>
                <div>
                  <p class="text-[#111811] text-base font-medium leading-normal">Journey Through the Serene Landscapes of Kyoto</p>
                  <p class="text-[#608560] text-sm font-normal leading-normal">Kyoto, Japan</p>
                </div>
              </div>
              <div class="flex flex-col gap-3 pb-3">
                <div
                  class="w-full bg-center bg-no-repeat aspect-[3/4] bg-cover rounded-xl"
                  style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuBdmA9RBaHX5hdQYTlqj_AZegHNdZHRvxRy4KCnBcYIcywaEBqzdL75QavAF1YfRt836_0oalUbv0u_OBSrMOFnSDOxM435Jxk9xEk4q_j184mkVqdMToCj_jPhiPYXJYHmZ_1fSPB2S6kr8qXspskJSTZi4vBMCGNDUKdd6auOI39MpBdi_L4zk_SwHYXGYOeSw-VTbku4OdygNbfTBtlzPL1QOE7Ap51WMgwA_g5MLvAQqCXl-swNamUgnQgckP5OzSumXDESNo0");'
                ></div>
                <div>
                  <p class="text-[#111811] text-base font-medium leading-normal">Conquer the Challenging Peaks of the Alps</p>
                  <p class="text-[#608560] text-sm font-normal leading-normal">The Alps, Europe</p>
                </div>
              </div>
              <div class="flex flex-col gap-3 pb-3">
                <div
                  class="w-full bg-center bg-no-repeat aspect-[3/4] bg-cover rounded-xl"
                  style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuD5HPa8ECMFEFsW2dySD8gZU2wK9gyLDiXASu7i8XL8kcQI2MZ95eHKqYYE_gkLXAxurOjnTF-OwhOWMV-8QAMPYhjgLewxvZVnMXBMzATorWt8SePw5D749gdNYRwrcTr1La3Y32f-BqGGC6MrjvzvE2cmWaAesaa7fLzAl0kvAKv_bWsTs5pm1-FR9vJoGitQj1bcXOXVpm2cnaPq5XJ86a-Qqe7tOmcJLZFusfXxo_zUtx23GRZhbAmpC2STqeWC8_5iqbDdhpc");'
                ></div>
                <div>
                  <p class="text-[#111811] text-base font-medium leading-normal">Dive into the Rich History of Athens</p>
                  <p class="text-[#608560] text-sm font-normal leading-normal">Athens, Greece</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>