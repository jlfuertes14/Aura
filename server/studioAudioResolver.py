#!/usr/bin/env python3
"""
Studio Audio Resolver for YouTube
Detects if a YouTube link is a Music Video with cinematic intros/skits/director cuts,
and automatically finds the corresponding pure studio audio / official audio track.
"""

import sys
import os
import json
import re
import subprocess
import argparse

CACHE_DIR = os.path.join(os.path.dirname(__file__), 'cache')
if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR, exist_ok=True)


def clean_title_for_search(title: str) -> str:
    """Strips video tags to extract pure song title and artist."""
    # Remove bracketed/parenthesized tags like (Official Music Video), [4K], etc.
    cleaned = re.sub(
        r'\s*[\(\[](official\s*(music\s*)?video|music\s*video|official\s*video|official|audio|visualizer|hd|4k|mv|m/v|cinematic|remastered|explicit|lyrics?)[\)\]]',
        '',
        title,
        flags=re.IGNORECASE
    )
    cleaned = re.sub(r'["\']', '', cleaned).strip()
    return cleaned


def is_music_video(title: str, duration: int) -> bool:
    """Checks if a video title indicates it is a music video with potential non-musical cuts."""
    mv_pattern = r'(\bofficial\s+(music\s+)?video\b|\bmusic\s+video\b|\bofficial\s+video\b|\bmv\b|\bm/v\b|\bcinematic\b|\bdirector\'?s\s+cut\b|\bshort\s+film\b)'
    return bool(re.search(mv_pattern, title, re.IGNORECASE))


def resolve_studio_audio(video_id: str) -> dict:
    # 1. Check disk cache first
    cache_file = os.path.join(CACHE_DIR, f"{video_id}_studio.json")
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                cached = json.load(f)
                if cached and 'studioVideoId' in cached:
                    return cached
        except Exception:
            pass

    # 2. Extract original video metadata
    info_cmd = [
        sys.executable,
        '-m',
        'yt_dlp',
        '--skip-download',
        '--dump-json',
        '--no-playlist',
        f'https://www.youtube.com/watch?v={video_id}'
    ]

    try:
        res = subprocess.run(info_cmd, capture_output=True, text=True, encoding='utf-8', timeout=15)
        if res.returncode != 0 or not res.stdout.strip():
            return {
                'success': False,
                'originalVideoId': video_id,
                'studioVideoId': video_id,
                'isMusicVideo': False,
                'cleanStudioResolved': False,
                'reason': 'Failed to fetch video info'
            }
        data = json.loads(res.stdout)
    except Exception as e:
        return {
            'success': False,
            'originalVideoId': video_id,
            'studioVideoId': video_id,
            'isMusicVideo': False,
            'cleanStudioResolved': False,
            'error': str(e)
        }

    orig_title = data.get('title', '')
    orig_duration = data.get('duration', 0)
    orig_channel = data.get('channel', '') or data.get('uploader', '')

    has_mv_tag = is_music_video(orig_title, orig_duration)

    # If it's already an audio track, topic track, or lyric video without MV tags, use directly
    is_already_studio = bool(re.search(r'(\b\[audio\]\b|\bofficial\s+audio\b|\b-\s+topic\b|\blyrics?\b)', orig_title + ' ' + orig_channel, re.IGNORECASE))
    if not has_mv_tag and is_already_studio:
        result = {
            'success': True,
            'originalVideoId': video_id,
            'studioVideoId': video_id,
            'isMusicVideo': False,
            'cleanStudioResolved': False,
            'title': orig_title,
            'duration': orig_duration,
            'channel': orig_channel,
        }
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2)
        return result

    # 3. Search YouTube for official studio audio without video cinematics
    clean_query = clean_title_for_search(orig_title)
    search_q = f"{clean_query} official audio"

    search_cmd = [
        sys.executable,
        '-m',
        'yt_dlp',
        '--default-search',
        'ytsearch5',
        '--dump-json',
        '--no-playlist',
        f'ytsearch5:{search_q}'
    ]

    best_candidate = None
    try:
        s_res = subprocess.run(search_cmd, capture_output=True, text=True, encoding='utf-8', timeout=20)
        candidates = []
        for line in s_res.stdout.splitlines():
            if not line.strip():
                continue
            try:
                item = json.loads(line)
                candidates.append({
                    'id': item.get('id'),
                    'title': item.get('title', ''),
                    'duration': item.get('duration', 0),
                    'channel': item.get('channel', '') or item.get('uploader', ''),
                })
            except Exception:
                pass

        scored_candidates = []
        for c in candidates:
            c_dur = c.get('duration') or 0
            # Must NOT be another official music video
            if is_music_video(c['title'], c_dur):
                continue

            # Must be a reasonable track length (not a short/teaser < 45s, not a 1-hour loop)
            if c_dur > 0:
                if c_dur < 45:
                    continue
                if orig_duration > 0 and c_dur > orig_duration + 20:
                    continue

            score = 0
            title_lower = c['title'].lower()
            channel_lower = c['channel'].lower()
            combo = f"{title_lower} {channel_lower}"

            # YouTube Music Topic tracks are the gold standard (exact album studio audio)
            if '- topic' in channel_lower or 'release - topic' in channel_lower:
                score += 100

            # Explicit studio audio tags
            if '[audio]' in title_lower or '(audio)' in title_lower:
                score += 80
            elif 'official audio' in title_lower:
                score += 75
            elif 'audio' in title_lower:
                score += 50

            # Lyric videos (no skits or dialogue)
            if 'official lyric video' in title_lower:
                score += 65
            elif 'lyric video' in title_lower or 'lyrics' in title_lower:
                score += 45

            # Visualizer
            if 'visualizer' in title_lower:
                score += 40

            # Duration bonus: if MV had skits (orig_duration > c_dur), and c_dur is shorter by 5-90s, likely pure audio!
            if orig_duration > 0 and orig_duration - 90 <= c_dur <= orig_duration - 3:
                score += 30

            scored_candidates.append((score, c))

        # Sort by highest score descending
        scored_candidates.sort(key=lambda x: x[0], reverse=True)
        if scored_candidates and scored_candidates[0][0] > 0:
            best_candidate = scored_candidates[0][1]
        elif scored_candidates:
            best_candidate = scored_candidates[0][1]

    except Exception as e:
        sys.stderr.write(f"[STUDIO RESOLVER] Search error: {e}\n")

    if best_candidate and best_candidate['id'] != video_id:
        result = {
            'success': True,
            'originalVideoId': video_id,
            'studioVideoId': best_candidate['id'],
            'isMusicVideo': True,
            'cleanStudioResolved': True,
            'originalTitle': orig_title,
            'studioTitle': best_candidate['title'],
            'originalDuration': orig_duration,
            'studioDuration': best_candidate['duration'],
            'channel': best_candidate['channel'],
        }
    else:
        result = {
            'success': True,
            'originalVideoId': video_id,
            'studioVideoId': video_id,
            'isMusicVideo': has_mv_tag,
            'cleanStudioResolved': False,
            'title': orig_title,
            'duration': orig_duration,
            'channel': orig_channel,
        }

    try:
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2)
    except Exception:
        pass

    return result


def main():
    parser = argparse.ArgumentParser(description="Resolve clean studio audio track for YouTube videos")
    parser.add_argument('video_id', type=str, help="YouTube video ID or URL")
    args = parser.parse_args()

    # Extract clean ID if full URL was provided
    match = re.search(r'(?:v=|\/)([\w-]{11})(?:\?|&|\/|$)', args.video_id)
    vid = match.group(1) if match else args.video_id

    res = resolve_studio_audio(vid)
    print(json.dumps(res, indent=2))


if __name__ == '__main__':
    main()
