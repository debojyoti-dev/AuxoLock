# AuxoLock Vercel Deployment Guide

## Step 1: Push Code to GitHub

1. **Initialize Git (if not already done):**
   ```bash
   cd D:\Code\AuxoLock\AuxoLock-BuildGames
   git add .
   git commit -m "Ready for Vercel deployment"
   git push origin main
   ```

2. **Ensure your GitHub repository is public or accessible to Vercel**

---

## Step 2: Sign Up / Log In to Vercel

1. Go to: https://vercel.com
2. Click "Sign Up" or "Log In"
3. Choose "Continue with GitHub" for easiest integration
4. Authorize Vercel to access your repositories

---

## Step 3: Import Your Project

1. Click **"Add New..." → "Project"** from Vercel dashboard
2. Find your repository: `AuxoLock-BuildGames`
3. Click **"Import"**

---

## Step 4: Configure Project Settings

### **Framework Preset:**
- Select: **Vite**

### **Root Directory:**
- Click **"Edit"**
- Set to: `frontend`
- ✅ This tells Vercel where your app lives

### **Build & Output Settings:**
- **Build Command:** `npm run build` (auto-detected, leave as-is)
- **Output Directory:** `dist` (auto-detected, leave as-is)
- **Install Command:** `npm install` (auto-detected, leave as-is)

### **Node.js Version:**
- Leave default (18.x or 20.x is fine)

---

## Step 5: Environment Variables (CRITICAL)

Click **"Environment Variables"** section and add:

| Name | Value |
|------|-------|
| `VITE_AUXOLOCK_ADDRESS` | `0x9052F56E18A49F32067CaE4Bc44A92F19ccc2334` |

**Important:**
- ✅ Apply to: **Production, Preview, and Development**
- ✅ Click "Add" after entering

---

## Step 6: Deploy

1. Click **"Deploy"**
2. Wait 1-3 minutes while Vercel:
   - Clones your repo
   - Installs dependencies
   - Runs `npm run build`
   - Deploys to CDN

3. You'll see build logs in real-time

---

## Step 7: Verify Deployment

Once deployed, you'll get:
- **Production URL:** `https://auxolock-build-games-xxx.vercel.app`
- Click "Visit" to open your live app

### **Test Checklist:**
1. ✅ Page loads without errors
2. ✅ "Connect Wallet" button works
3. ✅ MetaMask prompts to switch to Fuji
4. ✅ Navigate to all 6 pages (Landing, Create Lease, Deposit, Dashboard, Settlement, Admin)
5. ✅ Contract address is correctly set (check browser console: `import.meta.env.VITE_AUXOLOCK_ADDRESS`)

---

## Step 8: Custom Domain (Optional)

1. In Vercel project → **Settings → Domains**
2. Add your custom domain (e.g., `auxolock.com`)
3. Update DNS settings as instructed by Vercel
4. Wait for DNS propagation (5-60 minutes)

---

## Troubleshooting Common Issues

### **Issue: "Failed to compile"**
- Check build logs in Vercel dashboard
- Ensure all TypeScript errors are fixed locally first
- Run `npm run build` locally to verify

### **Issue: "404 on page refresh"**
- **Solution:** The `vercel.json` file handles this (already created)
- Ensures all routes redirect to index.html for client-side routing

### **Issue: "Connect Wallet" doesn't work**
- Check browser console for errors
- Verify `VITE_AUXOLOCK_ADDRESS` is set in Vercel env vars
- Ensure MetaMask is installed

### **Issue: "Cannot read contract"**
- Verify contract address matches deployed Fuji contract
- Check network in MetaMask (should be Fuji testnet)
- Verify contract is verified on Sourcify

---

## Redeployment (After Changes)

Vercel auto-deploys on every push to `main` branch:

1. Make changes locally
2. Commit and push:
   ```bash
   git add .
   git commit -m "Update feature X"
   git push origin main
   ```
3. Vercel automatically rebuilds and deploys
4. Check deployment status at: https://vercel.com/dashboard

---

## Environment Variables Reference

**Production (.env in Vercel):**
```
VITE_AUXOLOCK_ADDRESS=0x9052F56E18A49F32067CaE4Bc44A92F19ccc2334
```

**Local (.env in frontend/):**
```
VITE_AUXOLOCK_ADDRESS=0x9052F56E18A49F32067CaE4Bc44A92F19ccc2334
```

Both must match for consistent behavior between local dev and production.

---

## Quick Deploy Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel account created/logged in
- [ ] Repository imported to Vercel
- [ ] Root directory set to `frontend`
- [ ] Environment variable `VITE_AUXOLOCK_ADDRESS` added
- [ ] Deployment successful
- [ ] Live site tested with MetaMask
- [ ] All pages load correctly
- [ ] Contract interactions work

---

## Next Steps After Deployment

1. **Test full user flow on live site**
2. **Share demo URL with stakeholders**
3. **Monitor Vercel Analytics** (automatically enabled)
4. **Set up custom domain** (optional)
5. **Enable preview deployments** for PR reviews

Your AuxoLock dApp will be live at: `https://your-project-name.vercel.app`

Good luck with your demo! 🚀
