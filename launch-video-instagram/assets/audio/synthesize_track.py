import wave
import struct
import math
import random

SAMPLE_RATE = 44100
DURATION = 53.0 # seconds
TOTAL_SAMPLES = int(SAMPLE_RATE * DURATION)
BPM = 128.0
BEAT_DUR = 60.0 / BPM
SIXTEENTH = BEAT_DUR / 4.0

def clamp(val, low=-32767, high=32767):
    return max(low, min(high, int(val)))

# Prepare buffer for stereo 16-bit PCM (float accumulators)
left_buf = [0.0] * TOTAL_SAMPLES
right_buf = [0.0] * TOTAL_SAMPLES

# 1. KICK DRUM (Every beat, starts at bar 2 = ~3.75s, drops out briefly around 22s, builds to climax)
for sample_idx in range(TOTAL_SAMPLES):
    t = sample_idx / SAMPLE_RATE
    # Intro: no kick until 3.5s (when logo reveals)
    if t < 3.5:
        continue
    
    # Beat relative time
    t_rel = t - 3.5
    beat_idx = int(t_rel / BEAT_DUR)
    t_in_beat = t_rel - (beat_idx * BEAT_DUR)
    
    # Kick hits on every beat
    if t_in_beat < 0.22:
        # Pitch drop 140Hz -> 45Hz
        decay = math.exp(-t_in_beat * 18.0)
        freq = 45.0 + 95.0 * math.exp(-t_in_beat * 35.0)
        kick_wave = math.sin(2.0 * math.pi * freq * t_in_beat) * decay
        # Click transient
        click = (random.random() * 2.0 - 1.0) * math.exp(-t_in_beat * 120.0) * 0.3
        kick_val = (kick_wave + click) * 11000.0
        left_buf[sample_idx] += kick_val
        right_buf[sample_idx] += kick_val

# 2. SNARE / CLAP (Beats 2 and 4, starts at bar 4 = ~7.5s)
for sample_idx in range(TOTAL_SAMPLES):
    t = sample_idx / SAMPLE_RATE
    if t < 7.2:
        continue
    
    t_rel = t - 3.5
    beat_idx = int(t_rel / BEAT_DUR)
    beat_in_bar = beat_idx % 4
    t_in_beat = t_rel - (beat_idx * BEAT_DUR)
    
    if beat_in_bar in [1, 3] and t_in_beat < 0.25:
        # Noise burst + tone body
        tone_decay = math.exp(-t_in_beat * 25.0)
        noise_decay = math.exp(-t_in_beat * 14.0)
        tone = math.sin(2.0 * math.pi * 185.0 * t_in_beat) * tone_decay * 0.4
        noise = (random.random() * 2.0 - 1.0) * noise_decay * 0.7
        snare_val = (tone + noise) * 8500.0
        left_buf[sample_idx] += snare_val * 0.95
        right_buf[sample_idx] += snare_val * 1.05

# 3. HI-HATS (8th / 16th notes with subtle stereo pan)
for sample_idx in range(TOTAL_SAMPLES):
    t = sample_idx / SAMPLE_RATE
    if t < 7.2:
        continue
    
    t_rel = t - 3.5
    sixteenth_idx = int(t_rel / SIXTEENTH)
    t_in_sixteenth = t_rel - (sixteenth_idx * SIXTEENTH)
    
    # Closed hat on every 8th note, plus 16th during high energy sections
    is_hat = (sixteenth_idx % 2 == 1) or (t > 22.0 and sixteenth_idx % 2 == 0 and sixteenth_idx % 4 != 0)
    if is_hat and t_in_sixteenth < 0.05:
        hat_decay = math.exp(-t_in_sixteenth * 90.0)
        hat_noise = (random.random() * 2.0 - 1.0) * hat_decay * 3500.0
        pan = 0.3 * math.sin(t * 3.0)
        left_buf[sample_idx] += hat_noise * (1.0 - pan)
        right_buf[sample_idx] += hat_noise * (1.0 + pan)

# 4. ROLLING CYBER BASSLINE (D-Minor progression: D2 -> F2 -> C2 -> Bb1)
# 16th note groove: root notes with filter envelope
bass_notes = {
    0: 73.42,  # D2
    1: 87.31,  # F2
    2: 65.41,  # C2
    3: 58.27   # Bb1
}

for sample_idx in range(TOTAL_SAMPLES):
    t = sample_idx / SAMPLE_RATE
    if t < 3.5:
        # Pre-drop ominous sub-drone
        drone = math.sin(2.0 * math.pi * 55.0 * t) * (1.0 - math.exp(-t * 2.0)) * 6000.0
        left_buf[sample_idx] += drone
        right_buf[sample_idx] += drone
        continue
    
    t_rel = t - 3.5
    bar_idx = int(t_rel / (BEAT_DUR * 4))
    prog_idx = (bar_idx // 2) % 4
    root_freq = bass_notes[prog_idx]
    
    sixteenth_idx = int(t_rel / SIXTEENTH)
    t_in_sixteenth = t_rel - (sixteenth_idx * SIXTEENTH)
    
    # 16th bass notes
    decay = math.exp(-t_in_sixteenth * 16.0)
    # Rich sawtooth approximation (fundamental + harmonics)
    saw = 0.0
    for h in range(1, 6):
        saw += (math.sin(2.0 * math.pi * (root_freq * h) * t) / h)
    
    # Sub octave sine
    sub = math.sin(2.0 * math.pi * (root_freq * 0.5) * t) * 0.7
    bass_val = (saw * 0.6 + sub) * decay * 8000.0
    left_buf[sample_idx] += bass_val
    right_buf[sample_idx] += bass_val

# 5. CYBERPUNK ARPEGGIO SYNTH (Arpeggiated leads floating in stereo)
arp_freqs = [
    293.66, # D4
    349.23, # F4
    440.00, # A4
    523.25, # C5
    587.33, # D5
    440.00, # A4
    349.23, # F4
    523.25  # C5
]

for sample_idx in range(TOTAL_SAMPLES):
    t = sample_idx / SAMPLE_RATE
    # Arp starts gentle at 3.5s and ramps up
    if t < 3.5 or t > 51.0:
        continue
    
    t_rel = t - 3.5
    sixteenth_idx = int(t_rel / SIXTEENTH)
    t_in_sixteenth = t_rel - (sixteenth_idx * SIXTEENTH)
    note_freq = arp_freqs[sixteenth_idx % len(arp_freqs)]
    
    # Pluck envelope
    pluck = math.exp(-t_in_sixteenth * 12.0)
    pulse = math.sin(2.0 * math.pi * note_freq * t) + 0.3 * math.sin(2.0 * math.pi * note_freq * 2.0 * t)
    
    # Stereo ping-pong panning
    pan_pos = math.sin(sixteenth_idx * 0.785) # ~45 deg per 16th
    left_gain = (1.0 - pan_pos) * 0.5
    right_gain = (1.0 + pan_pos) * 0.5
    
    # Volume envelope based on section
    volume = 4500.0 if t > 7.0 else 2500.0
    arp_val = pulse * pluck * volume
    left_buf[sample_idx] += arp_val * left_gain
    right_buf[sample_idx] += arp_val * right_gain

# 6. IMPACT DROPS & RISERS (Transitions at 3.5s, 14.5s, 26.0s, 36.0s, 42.0s)
transitions = [3.5, 14.5, 26.0, 36.0, 42.5]
for trans_t in transitions:
    trans_sample = int(trans_t * SAMPLE_RATE)
    
    # Riser (1.5s leading up to transition)
    riser_start = max(0, int((trans_t - 1.2) * SAMPLE_RATE))
    for s in range(riser_start, min(trans_sample, TOTAL_SAMPLES)):
        progress = (s - riser_start) / (trans_sample - riser_start)
        freq = 150.0 + (progress ** 2.0) * 1200.0
        rise_val = math.sin(2.0 * math.pi * freq * (s / SAMPLE_RATE)) * progress * 5000.0
        noise = (random.random() * 2.0 - 1.0) * progress * 3000.0
        left_buf[s] += (rise_val + noise) * 0.5
        right_buf[s] += (rise_val + noise) * 0.5
    
    # Sub impact explosion (at transition point)
    for s in range(trans_sample, min(trans_sample + int(SAMPLE_RATE * 1.5), TOTAL_SAMPLES)):
        t_sub = (s - trans_sample) / SAMPLE_RATE
        sub_decay = math.exp(-t_sub * 4.0)
        sub_impact = math.sin(2.0 * math.pi * 50.0 * math.exp(-t_sub * 3.0) * t_sub) * sub_decay * 12000.0
        left_buf[s] += sub_impact
        right_buf[s] += sub_impact

# 7. MASTER LIMITING & EXPORT TO 16-BIT STEREO WAV
output_path = r'C:\Users\GAMING\Desktop\pismcontroller\launch-video\assets\audio\singularity-synthwave.wav'
with wave.open(output_path, 'w') as wav:
    wav.setnchannels(2)
    wav.setsampwidth(2)
    wav.setframerate(SAMPLE_RATE)
    
    # Smooth fade out in the last 1.5 seconds
    fade_start = int((DURATION - 1.5) * SAMPLE_RATE)
    frames = bytearray()
    
    for i in range(TOTAL_SAMPLES):
        gain = 1.0
        if i > fade_start:
            gain = max(0.0, 1.0 - (i - fade_start) / (TOTAL_SAMPLES - fade_start))
        
        l = clamp(left_buf[i] * gain * 0.85)
        r = clamp(right_buf[i] * gain * 0.85)
        frames.extend(struct.pack('<hh', l, r))
    
    wav.writeframes(frames)

print(f'Synthesized full cinematic soundtrack -> {output_path}')
