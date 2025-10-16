#!/bin/bash

echo "=========================================="
echo "Cleaning Profile Lock Files on Host"
echo "=========================================="
echo ""

# Navigate to the profiles directory
cd ~/n8n_comments_bots

echo "Removing Twitter profile locks..."
rm -fv twitter_profile/SingletonLock 2>/dev/null || echo "  (no SingletonLock)"
rm -fv twitter_profile/SingletonSocket 2>/dev/null || echo "  (no SingletonSocket)"
rm -fv twitter_profile/SingletonCookie 2>/dev/null || echo "  (no SingletonCookie)"
rm -fv twitter_profile/Default/SingletonLock 2>/dev/null || echo "  (no Default/SingletonLock)"
rm -fv twitter_profile/Default/SingletonSocket 2>/dev/null || echo "  (no Default/SingletonSocket)"
rm -fv twitter_profile/Default/SingletonCookie 2>/dev/null || echo "  (no Default/SingletonCookie)"
echo "✓ Twitter profile cleaned"
echo ""

echo "Removing LinkedIn profile locks..."
rm -fv linkedin_profile/SingletonLock 2>/dev/null || echo "  (no SingletonLock)"
rm -fv linkedin_profile/SingletonSocket 2>/dev/null || echo "  (no SingletonSocket)"
rm -fv linkedin_profile/SingletonCookie 2>/dev/null || echo "  (no SingletonCookie)"
rm -fv linkedin_profile/Default/SingletonLock 2>/dev/null || echo "  (no Default/SingletonLock)"
rm -fv linkedin_profile/Default/SingletonSocket 2>/dev/null || echo "  (no Default/SingletonSocket)"
rm -fv linkedin_profile/Default/SingletonCookie 2>/dev/null || echo "  (no Default/SingletonCookie)"
echo "✓ LinkedIn profile cleaned"
echo ""

echo "Removing TikTok profile locks..."
rm -fv tiktok_profile/SingletonLock 2>/dev/null || echo "  (no SingletonLock)"
rm -fv tiktok_profile/SingletonSocket 2>/dev/null || echo "  (no SingletonSocket)"
rm -fv tiktok_profile/SingletonCookie 2>/dev/null || echo "  (no SingletonCookie)"
rm -fv tiktok_profile/Default/SingletonLock 2>/dev/null || echo "  (no Default/SingletonLock)"
rm -fv tiktok_profile/Default/SingletonSocket 2>/dev/null || echo "  (no Default/SingletonSocket)"
rm -fv tiktok_profile/Default/SingletonCookie 2>/dev/null || echo "  (no Default/SingletonCookie)"
echo "✓ TikTok profile cleaned"
echo ""

echo "=========================================="
echo "✅ All lock files removed!"
echo "=========================================="
echo ""
echo "Now restart the container:"
echo "  docker-compose restart"
echo ""

