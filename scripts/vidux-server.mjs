import { createViduxApiServer } from '../dist/saas/api.js';

const PORT = process.env.PORT || 8080;
const server = createViduxApiServer();

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 VIDUXTOOL SaaS Backend & Harness Gateway Live!`);
  console.log(`📡 Listening on http://localhost:${PORT}`);
  console.log(`🎬 Available Models: OmniFlash 1.2, MiniMax H3, Kling 4, Veo 2`);
  console.log(`🎨 Available Niches: UGC Ads, Skits, Faceless 3D, Stream Clips`);
  console.log(`💰 Credit Ledger: 100 Credits = $1.00 USD`);
  console.log(`=======================================================`);
});
