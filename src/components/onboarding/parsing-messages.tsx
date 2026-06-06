import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

export const PARSE_MESSAGES = [
  "Grab a cup of coffee",
  "Take a 5 min walk",
  "Hit 20 pushups",
  "Stretch your legs",
  "Take a deep breath in",
  "Slowly exhale...",
  "Look out the window",
  "Roll your shoulders back",
  "Close your eyes for a moment",
  "Drink a glass of water",
  "Sit up nice and tall",
  "Unclench your jaw",
  "Wiggle your toes",
  "Crack your knuckles",
  "Roll your neck gently",
  "Write down three things you're grateful for",
  "Hum your favorite song",
  "Tap your fingers to a rhythm",
  "Squeeze a stress ball",
  "Do 10 calf raises",
  "Straighten your posture",
  "Smile for no reason",
  "Blink slowly a few times",
  "Massage your temples",
  "Shrug your shoulders up and down",
  "Do a quick seated twist",
  "Touch your toes",
  "Take a sip of tea",
  "Pet your cat or dog",
  "Listen to the birds outside",
  "Count backward from 20",
  "Visualize your goal university",
  "Repeat: 'I've got this'",
  "Flex your feet back and forth",
  "Do 5 jumping jacks",
  "Hug yourself for 5 seconds",
  "March in place for 30 seconds",
  "Do a wall sit for 15 seconds",
  "Breathe in for 4 counts",
  "Hold for 4 counts",
  "Breathe out for 6 counts",
  "Repeat a positive mantra",
  "Think of a happy memory",
  "Trace shapes on your palm",
  "Gently massage your hands",
  "Look at something green",
  "Let your mind wander",
  "Make a mental to-do list",
  "Plan a fun weekend activity",
  "Recall a funny joke",
  "Name 5 things you can see",
  "Name 4 things you can feel",
  "Name 3 things you can hear",
  "Name 2 things you can smell",
  "Name 1 thing you can taste",
  "Do a quick gratitude check-in",
  "Rest your hands in your lap",
  "Lengthen your spine",
  "Tuck your chin slightly",
  "Soften your gaze",
  "Set an intention for the day",
  "Think of someone who inspires you",
  "Imagine your dream study spot",
  "Do 10 arm circles",
  "Roll your wrists gently",
  "Stand up and sit back down",
  "Fix your posture one more time",
  "Organize your desk a little",
  "Straighten a stack of papers",
  "Tidy up your keyboard",
  "Wipe your screen gently",
  "Plug in your charger if low",
  "Check your pen collection",
  "Rearrange a small shelf",
  "Water a nearby plant",
  "Brush some dust off your desk",
  "Fold a piece of paper into a shape",
  "Doodle on a scrap page",
  "Stare at a blank wall for 10 seconds",
  "Listen to ambient sounds",
  "Whistle a short tune",
  "Tap a steady beat on the table",
  "Bounce your leg gently",
  "Stretch your fingers wide",
  "Clench and release your fists",
  "Reach your arms overhead",
  "Lean side to side slowly",
  "Rotate your ankles in circles",
  "Press your palms together firmly",
  "Raise your eyebrows high then relax",
  "Puff your cheeks and release",
  "Tense your whole body for 5 seconds",
  "Let everything go limp",
  "Enjoy this moment of stillness",
  "Think of your favorite summer day",
  "Recall the smell of rain",
  "Picture a calm ocean wave",
  "Imagine a gentle breeze",
  "You're doing great — keep going",
  "Almost there — stay chill",
  "Your future self thanks you",
  "One step closer to your goals",
  "Progress, not perfection",
  "Small wins add up",
  "You've handled harder things",
  "This is the easy part",
];

interface ParsingMessagesProps {
  visible: boolean;
  title?: string;
}

export function ParsingMessages({ visible, title }: ParsingMessagesProps) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % PARSE_MESSAGES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <Loader2 className="h-10 w-10 animate-spin" style={{ color: "#4ECCA3" }} />
      <p className="text-sm font-medium" style={{ color: "#cbd5e1" }}>
        {title ?? "Scanning your transcript..."}
      </p>
      <div
        className="px-4 py-3 rounded-lg"
        style={{ background: "rgba(78,204,163,0.06)", border: "1px solid rgba(78,204,163,0.12)" }}
      >
        <p
          className="text-[10px] pwc-font-mono uppercase tracking-wider mb-2"
          style={{ color: "#475569" }}
        >
          This should take a minute, meanwhile:
        </p>
        <p
          key={msgIndex}
          className="text-sm italic leading-relaxed min-h-[2lh]"
          style={{ color: "#4ECCA3" }}
        >
          {PARSE_MESSAGES[msgIndex]}
        </p>
      </div>
    </div>
  );
}
