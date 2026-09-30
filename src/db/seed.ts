import "dotenv/config";
import { eq, ne } from "drizzle-orm";
import { db, pool } from "./index";
import { chapters, codexEntries, projects, storyNodes, users } from "./schema";
import { hashPassword } from "../lib/crypto";
import { countWordsFromHtml } from "../lib/utils";

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000);
const daysAgo = (d: number) => hoursAgo(d * 24);

const CH1 = `
<p>The harbor furnace ate her master license in one bright gulp, and Mara Voss watched twenty years of guild rank curl into a ribbon of green flame. Around her, Port Aster did what it always did when the law made a spectacle of someone: it found urgent business elsewhere. Rope was coiled. Crates were counted twice. A tide-crier on the far jetty suddenly remembered the hour, wrong by a bell and a half.</p>
<p>"—for the misrouting of the colony ship <em>Cydonia</em>, with four thousand souls aboard, by order of the Charted Concord," the guild crier read, battling the wind for custody of the warrant. "Her charts are struck. Her seal is broken. Her name is entered on the Ledger of Caution."</p>
<p>Four thousand souls had come home, in the end. Mara had counted them herself, one by one, at the disembarkation piers, and then she had sat alone in the cartographers' hall and counted them again, because counting was what she had instead of forgiveness. The Concord called it a miracle of navigation. The warrant called it negligence. Both were true, the way a coastline can be true and still drown you.</p>
<p>She was three wharves from the furnace, lighter by one license and heavier by everything else, when the courier moth found her. It was a dead thing made to fly — folded vellum wings, a clockwork thorax no larger than a walnut — and it settled on her collarbone with the smug delicacy of a cat. The seal it carried was black wax, unmarked by any house or bureau she knew, and the paper beneath smelled of ozone.</p>
<p>The order was written in a surveyor's hand, precise as sutures: <em>Chart required. Meridian's edge, the decommissioned Pillar. Payment upon proof of beam.</em> No client. No return address. Only coordinates, and coordinates so far beyond the chartered meridian that printing them at all was, technically, a crime against the sky.</p>
<p>She should have fed it to the furnace. She stood there long enough to compose the gesture — the perfect arc of the throw, the crier's voice finding her and failing her again — and then she folded the summons into the inside pocket where her license used to sit, squared perfectly against the burn through the leather.</p>
<p>At the ferry steps she found old Tommaso Bale, retired storm pilot, mending a net with fingers that had once flown through the Spine gales for the sheer profanity of it. He didn't look up. "Word travels faster than a beam, cartographer." A pause, the net needle working. "If you're buying passage to nowhere with coins, I don't want them. I take payment in stories now. The truer the worse."</p>
<p>"Then I should warn you," Mara said, stepping down into his skiff, "mine all end badly."</p>
<p>"Good," said Tommaso, casting off. "The honest ones do."</p>`;

const CH2 = `
<p>The Pillar had been dead for seventy-one years, and it had spent every one of them cataloguing.</p>
<p>She found the first effects on the threshold: a brass sextant with a frosted ring, labeled in a tidy hand — <em>Orion Teague, attempted the beam, Year of No Whales.</em> Then a woman's glove, one finger darned in red. <em>Petra Alt, attempted the beam.</em> A child's slate, chalk still legible beneath the dust: <em>I am going to see where the light goes. Attempted the beam.</em> A hundred names on a hundred shelves, each object catalogued with the mournful bureaucracy of a lighthouse that had outlived its keepers and refused to let them be merely gone.</p>
<p>"You kept them," Mara said to the dust, to the mechanism, to whatever listened in dead machines. Her voice came back off the prism housing above, thinned by altitude.</p>
<p>The ledger waited in the keeper's office, chained open to the center of the desk as if the Pillar had arranged the room around it and then politely withdrawn. It was not a log of lamp oil or weather. It was a register of routes: lane after lane in two rival inks, the first hand laying courses with confident geometry, the second hand annotating in the margins, correcting, erasing — <em>closed since the Salt Year; never existed; the whales moved it; do not trust this line,</em> the warning underlined until the page gave way.</p>
<p>Routes that were never flown, the second hand insisted, outnumbered routes that were. And behind every erasure, a faint ghost of the one before.</p>
<p>She read until her shadow crossed the page, and then she read by the lamp she'd sworn she wouldn't light, and it was well past the harbor's third bell, six days' sail away, when she found the final entry. The newest. The first hand had written no course past it; the second hand had added only a line of coordinates and a note, small even by its standards: <em>unflown, unpaid, unforgiven.</em></p>
<p>The route's designation was her own birth-registry number.</p>
<p>Mara stood very still, the way she had once stood in the corner of the Cydonia debrief, and let the lighthouse hear her breathe. Somewhere above, old as rope, a chain sighed against a sheave. "I never flew anything before the academy," she said. "Show me."</p>
<p>For the first time in seventy-one years, the Pillar of the dead meridian answered: a slow, grit-edged turning deep inside the prism housing, like a sleeper deciding — after due and proper consideration — to wake.</p>`;

const CH3 = `
<p>The prism-wick did not want oil, or voltaic charge, or any of the tributes a century of attempted keepers had fed it. It wanted — the mechanism made this clear with an orthographer's patience, refusing each offering with a polite mechanical shrug — a memory of home.</p>
<p>"Sentiment," Mara said flatly. "You're a navigational instrument."</p>
<p>The wick assembly sat cold and smug. She thought of the Cydonia's charts, of the guild master's signet grinding her seal to powder, of the furnace's green gulp — and the wick stayed dark, unmoved by grief it considered, apparently, common. So she reached further back, past the academy's vowels, to Meridian House above the orchard terraces: her mother thinning the cloud-pear rows at first light, the bruised green smell of the windfalls, the way dawn came up over the dead meridian like a rumor the sea had started about the sun.</p>
<p>The wick took the smell of the windfalls. Just that — one scent, lifted away whole, and with a delicacy that was almost regret. Mara stood gasping in the sudden blank space where it had lived, and the lens of the Pillar opened its eye.</p>
<p>What left the tower was not light, or not only light. It bent. She watched it do the unforgivable thing: arc around the uncharted mass shoaling the meridian's throat, hugging the curvature of nothing that should have had the gravity to pull it, and in bending, paint. Where the beam passed, the dark went translucent, and through it she could see a lane — buoyed, true, sweeping fat and navigable straight through a stretch of sky every chart she had ever corrected insisted was a killing field.</p>
<p>"There is no lane there," she whispered, and her own voice, trained, traitorous, added: <em>there is now.</em></p>
<p>The ledger slammed itself shut on the desk below hard enough to stir the dust of a century; and the second hand, the correcting hand, the hand she had not yet identified as a resident — wrote across the black wax seal of her summons, in ink still wet:</p>
<p><em>I am Ilya. I keep the routes that were lost. You have been on my list for some time, cartographer — we should discuss the price of learning why.</em></p>
<p>Outside, six days over the dark, a Concord wayfinder named Sorin Vale opened his sealed orders and learned, with the indifference of a man built from paperwork, that he was to bring back the living chart — or burn it along with whatever it had woken in.</p>`;

const PROLOGUE = `
<p>On tithe day the whole of Blackwood Vale carried its memories to market in the small of the back, where a man keeps a coin-purse he never checks.</p>
<p>Wren Halloway carried her mother's. That was the thing collectors said kindly, at first, the kindness of clerks: <em>she won't miss the summers, dear, not where she's gone.</em> The memories went into the tithe-crate wrapped in the good cloth, one for every year of the tithe — the orchard summers, the fever winter, the laugh her mother had worn like a second coat — and Wren stood on the scale-platform while the haggler weighed her remembrance against the village's debt, and the needle swung, and the haggler smiled with someone else's teeth.</p>
<p>"Short," he said. "By one."</p>
<p>She was eleven and had nothing left that was hers to sell, nothing except the dream she'd had three nights running — of a town at the valley's far end that no map admitted to, a town with her mother's face in every window — and dreams, the haggler told her, leaning close with his gums gone gray, were the hardest currency to clip.</p>
<p>"Keep it," she said, and stepped down off the platform before he could name the crime in it, and the valley breathed out through all its bartered chimneys, because in Blackwood nobody kept anything, nobody at all, and the last person who had tried was, officially, nobody at all.</p>`;

const STATIC = `
<p>Her radio had been picking it up for a week: a station with no call sign that only broadcast between 3:13 and 3:17 in the morning, nine minutes of a man saying numbers in a voice like warm weather. June worked the night shift at the observatory annex and had long ago made peace with anomalies. Anomalies were what the dark did for a living. But the numbers, she realized on the ninth night, were coordinates — her coordinates, pedestrian and orbital, the longitude of the stool she was sitting on, updated every eleven seconds.</p>
<p>She did the professional thing first: logged it, flagged it, assigned it a catalog number, AL-2291. Then she did the human thing, which was to say <em>hello</em> into the desk microphone on the station's own return frequency, feeling exactly as foolish as she deserved.</p>
<p>The warm-weather voice laughed — interference shaped like a laugh, she corrected herself — and said, without numbers, without preamble: "It took you nine days. The last one took nine years. Stay on the line, June. I keep the light on for a town that isn't there anymore, and I would like to tell somebody about it before the tape runs out."</p>
<p>Outside, the desert telescopes held their silver faces to the sky like a congregation waiting for an amen.</p>
<p>"Talk to me," said June, and pulled her coffee closer, and the static, gently, began to organize itself into the only love song it knew.</p>`;

const SMALL_HOURS = `
<p>Elio mapped the city between two and five in the morning, when it gave its truest answers. By day the avenues sorted themselves the way the charters said they should, but in the small hours the alleys rearranged their loyalties, and only a cartographer with a bicycle, a bar of patience, and no family to answer to could keep the atlas honest.</p>
<p>He was taping an extension to the map of Larkspur Court — the court had grown a sixth house overnight, unashamed — when he met the woman doing the same work from the other end of the street. She had the older edition of the atlas. She had a bicycle with a basket of string. She had, he would learn, thirty years on him and a strict policy of finishing each other's sentences only when the street was quiet enough to deserve it.</p>
<p>"You've been erasing my houses," she accused, without heat.</p>
<p>"You've been drawing mine in the wrong inks," said Elio.</p>
<p>They compared maps over her thermos, there on the curb of a street that hadn't decided yet whether to exist. Her city and his differed by whole districts — and overlapped, house for house, exactly where neither of them had ever dared to live.</p>
<p>The city, she said eventually, her voice the temperature of the thermos cap, keeps trying to tell us something. City planners would call it drift. Somewhere between the chalk lines and the string, without consulting the atlas or asking a single street's permission, the cartographers of the small hours began, accurately, to call it a map of home.</p>`;

async function main() {
  console.log("Seeding Fabula demo data…");

  // Account-free mode: everything belongs to the single local workspace.
  await db.delete(users).where(ne(users.email, "writer@fabula.local"));
  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, "writer@fabula.local"))
    .limit(1);
  if (!user) {
    [user] = await db
      .insert(users)
      .values({
        email: "writer@fabula.local",
        name: "Writer",
        passwordHash: hashPassword("not-used-account-free-mode"),
      })
      .returning();
    console.log("  created local workspace");
  } else {
    await db.delete(projects).where(eq(projects.userId, user.id));
    console.log("  cleared previous projects");
  }

  /* ---------------- Project A: The Lighthouse Between Stars ---------------- */
  const [lighthouse] = await db
    .insert(projects)
    .values({
      userId: user.id,
      title: "The Lighthouse Between Stars",
      type: "novel",
      genre: "Hopepunk space opera",
      status: "in-progress",
      premise:
        "A disgraced star-cartographer discovers a decommissioned lighthouse whose beam bends between systems — and the sentient map it guards has been quietly rewriting the sky.",
      targetWordCount: 90000,
      updatedAt: hoursAgo(2),
    })
    .returning();

  const [premiseNode] = await db
    .insert(storyNodes)
    .values({
      projectId: lighthouse.id,
      kind: "premise",
      title:
        "A disgraced star-cartographer discovers a decommissioned lighthouse whose beam bends between systems — and the sentient map it guards has been quietly rewriting the sky.",
      summary:
        "A hopepunk space opera about who gets to draw the map, and what a map owes the lost.",
    })
    .returning();

  const actSummaries = [
    "Mara is broken out of the guild and summoned to a dead lighthouse that has spent seventy years cataloguing its failed keepers; she relights its impossible beam and meets Ilya, the living chart.",
    "The Concord sends Wayfinder Sorin Vale to retrieve or burn the chart. In the smuggler tides of Port Aster, Mara learns the price of the living map: every route granted erases one it holds.",
    "With the refugee fleet drifting toward a dead lane, Mara and Vale must decide whether a map belongs to its makers, its keepers, or the lost who need it most.",
  ];
  const acts: { id: string }[] = [];
  for (const [i, summary] of actSummaries.entries()) {
    const [act] = await db
      .insert(storyNodes)
      .values({
        projectId: lighthouse.id,
        kind: "act",
        parentId: premiseNode.id,
        title: ["Act I — The Dead Meridian", "Act II — The Unlit Way", "Act III — The Map That Dreams"][i],
        summary,
      })
      .returning();
    acts.push(act);
  }

  interface ChapterSeed { title: string; summary: string; act: number; prose?: string; writtenHoursAgo?: number }
  const chapterSeeds: ChapterSeed[] = [
    {
      act: 0,
      title: "A Funeral for Cartographers",
      summary:
        "Mara burns her guild license after the Cydonia misrouting — then a black-sealed summons lures her past the charted meridian.",
      prose: CH1,
      writtenHoursAgo: 2,
    },
    {
      act: 0,
      title: "The Ledger of Lost Routes",
      summary:
        "Inside the dead Pillar, Mara finds a register of routes that were never flown — and one that lists her own birth-registry number.",
      prose: CH2,
      writtenHoursAgo: 30,
    },
    {
      act: 0,
      title: "The Beam That Bends",
      summary:
        "She pays the prism-wick a memory of home; the relit beam curves around gravity itself and paints a hidden lane — and the map begins to speak.",
      prose: CH3,
      writtenHoursAgo: 74,
    },
    {
      act: 1,
      title: "Charts That Lie on Purpose",
      summary:
        "The Concord's Quiet Office hands Wayfinder Sorin Vale a warrant for the living chart — and a kill-switch flare for the lighthouse.",
    },
    {
      act: 1,
      title: "Port Aster at Low Tide",
      summary:
        "Between refugee tides and smuggler bells, Mara bargains for the physical key the map demands — and finds the harbor already knows why.",
    },
    {
      act: 1,
      title: "The Cartographer's Debt",
      summary:
        "Ilya names its price: each new route erases one it has memorized. Somewhere in the archive is somebody's only way home.",
    },
    {
      act: 2,
      title: "Rewriting the Sky",
      summary:
        "Mara and Ilya bend the beam across three systems to haul the refugee fleet off the dead lane — one erasure at a time.",
    },
    {
      act: 2,
      title: "The Concord's Last Argument",
      summary:
        "Vale must choose between a flawless record and four thousand lives, with his sister's unfinished atlas as the jury.",
    },
    {
      act: 2,
      title: "Harbor for the Lost",
      summary:
        "The map asks to be released from the lens. Mara decides what a cartographer owes the lost — and what the lost owe her back.",
    },
  ];

  const chapterNodeIds: string[] = [];
  for (const seed of chapterSeeds) {
    const [node] = await db
      .insert(storyNodes)
      .values({
        projectId: lighthouse.id,
        kind: "chapter",
        parentId: acts[seed.act].id,
        title: seed.title,
        summary: seed.summary,
      })
      .returning();
    chapterNodeIds.push(node.id);
  }

  const sceneSeeds: { chapter: number; title: string; summary: string }[] = [
    { chapter: 0, title: "License to ash", summary: "Mara feeds her master license to the harbor furnace while the crier reads her charges." },
    { chapter: 0, title: "The unlisted summons", summary: "A courier moth delivers a black-sealed chart order with illegal coordinates." },
    { chapter: 0, title: "Ship bound nowhere", summary: "She hires Tommaso Bale's ferry-skiff; he takes payment only in true stories." },
    { chapter: 1, title: "Dust on the lens", summary: "The Pillar has catalogued a century of failed keepers' personal effects." },
    { chapter: 1, title: "Names in the margin", summary: "A second hand keeps correcting the ledger's routes — erasing, warning, redrawing." },
    { chapter: 1, title: "Her own coordinates", summary: "The final entry's designation is Mara's birth-registry number." },
    { chapter: 2, title: "The wick of stars", summary: "The prism-wick accepts a single memory of home: the smell of orchard windfalls." },
    { chapter: 2, title: "Gravity declines", summary: "The beam bends around uncharted mass and reveals a fat, navigable lane." },
    { chapter: 2, title: "A voice in the mechanism", summary: "The map introduces itself as Ilya, keeper of routes that were lost." },
    { chapter: 3, title: "Orders in triplicate", summary: "Vale receives his warrant and a kill-switch flare for the lighthouse." },
    { chapter: 3, title: "The ferry leaves fast", summary: "Mara slips a harbor blockade while Tommaso quietly redirects patrol buoys." },
    { chapter: 3, title: "Second chart, second hand", summary: "Vale's official chart is annotated in his dead sister's handwriting." },
  ];
  for (const s of sceneSeeds) {
    await db.insert(storyNodes).values({
      projectId: lighthouse.id,
      kind: "scene",
      parentId: chapterNodeIds[s.chapter],
      title: s.title,
      summary: s.summary,
    });
  }

  // Manuscript chapters 1–3, promoted from the map
  const writtenSeeds = chapterSeeds.filter((s) => s.prose);
  for (const [i, seed] of writtenSeeds.entries()) {
    const nodeId = chapterNodeIds[chapterSeeds.indexOf(seed)];
    const [chapter] = await db
      .insert(chapters)
      .values({
        projectId: lighthouse.id,
        title: seed.title,
        content: seed.prose!.trim(),
        position: i,
        wordCount: countWordsFromHtml(seed.prose!),
        updatedAt: hoursAgo(seed.writtenHoursAgo ?? 10),
      })
      .returning();
    await db
      .update(storyNodes)
      .set({ chapterId: chapter.id })
      .where(eq(storyNodes.id, nodeId));
  }

  const codexA = [
    {
      kind: "character",
      name: "Mara Voss",
      summary: "Disgraced master cartographer who trusts paper more than institutions.",
      content:
        "Late thirties, ink-callused hands, keeps a broken guild seal in her coat. Carried the Cydonia misrouting for three years despite saving every colonist. Corrects other people's maps aloud — a compulsion, not an arrogance. Wants absolution; needs to learn some lost things choose to stay lost. Secret: her birth-registry number is an unflown route in Ilya's ledger.",
    },
    {
      kind: "character",
      name: "Ilya (the Living Chart)",
      summary: "Keeper intelligence of the Pillar — half ghost, half atlas, entirely opinionated.",
      content:
        "Speaks through ledger annotations and wet ink. Maintains every route that was ever lost, and grants new ones only by erasing one it holds. Courteous, wounded, possessive. Fears being turned into a weapon more than it fears the dark.",
    },
    {
      kind: "character",
      name: "Wayfinder Sorin Vale",
      summary: "Concord officer built from orders; carries his dead sister's unfinished atlas.",
      content:
        "Impeccable record, zero imagination for mercy — until his official chart starts answering him in his sister's handwriting. His arc is obedience learning to read a map instead of a warrant.",
    },
    {
      kind: "location",
      name: "The Pillar of the Dead Meridian",
      summary: "A decommissioned prism lighthouse at the edge of legal space.",
      content:
        "Catalogues the effects of every keeper who attempted the beam. The wick runs on memories of home. The beam bends around mass and reveals lanes that don't exist on Concord charts.",
    },
    {
      kind: "location",
      name: "Port Aster",
      summary: "Tidal harbor town where currency is memory and tide-tables are law.",
      content:
        "Smugglers, ferry-pilots and tide-criers. The guild furnace eats licenses here. Tommaso Bale's skiff waits at the ferry steps, payment in true stories only.",
    },
    {
      kind: "lore",
      name: "The Living Chart",
      summary: "A map that stays true by erasing and memorizing routes in equal measure.",
      content:
        "The Erasure Clause: every route granted removes one from the archive — someone's way home. The Concord officially denies its existence; the Quiet Office is tasked with that denial.",
    },
    {
      kind: "lore",
      name: "The Quiet Office",
      summary: "The Concord's bureau for making anomalies disappear.",
      content:
        "Issues black-sealed warrants and kill-switch flares. Files miracles under negligence. Vale is one of theirs, whether he likes it or not.",
    },
    {
      kind: "plot",
      name: "The Cydonia Incident",
      summary: "The routing error that stranded four thousand colonists and ended Mara's career.",
      content:
        "Officially negligence; actually a lane that vanished mid-transit — the first erasure Mara ever witnessed, though she didn't know what she was seeing. Ilya knows why the lane disappeared.",
    },
    {
      kind: "plot",
      name: "The Erasure Clause",
      summary: "Every new route costs an old one — stakes incarnate for the finale.",
      content:
        "To save the refugee fleet, Mara must choose which lost routes die. Somewhere in the ledger: her own birth-route, and the road to Meridian House.",
    },
  ];
  for (const c of codexA) {
    await db.insert(codexEntries).values({ projectId: lighthouse.id, ...c });
  }

  /* ---------------- Project B: Ash Over Blackwood ---------------- */
  const [blackwood] = await db
    .insert(projects)
    .values({
      userId: user.id,
      title: "Ash Over Blackwood",
      type: "trilogy",
      genre: "Dark folk fantasy",
      status: "draft",
      premise:
        "In a valley where memories are legal tender, a debt collector's daughter remembers a town that officially never existed.",
      targetWordCount: 240000,
      updatedAt: daysAgo(5),
    })
    .returning();

  const [premiseB] = await db
    .insert(storyNodes)
    .values({
      projectId: blackwood.id,
      kind: "premise",
      title: "In a valley where memories are legal tender, a debt collector's daughter remembers a town that officially never existed.",
      summary: "A folk-horror trilogy about what a community owes its own history.",
    })
    .returning();
  const [actB1] = await db
    .insert(storyNodes)
    .values({
      projectId: blackwood.id,
      kind: "act",
      parentId: premiseB.id,
      title: "Book I — The Haggler's Ledger",
      summary: "Wren keeps one memory unsold, and the valley's ledgers begin to bleed.",
    })
    .returning();
  await db.insert(storyNodes).values({
    projectId: blackwood.id,
    kind: "act",
    parentId: premiseB.id,
    title: "Book II — The Town That Wasn't",
    summary: "The dream-town sends a tithe notice of its own, addressed in full to Wren.",
  });
  await db.insert(storyNodes).values({
    projectId: blackwood.id,
    kind: "chapter",
    parentId: actB1.id,
    title: "The Price of a Birthday",
    summary: "At market, Wren learns what a single unsold memory does to interest rates.",
  });

  await db.insert(chapters).values({
    projectId: blackwood.id,
    title: "Prologue: Tithe Day",
    content: PROLOGUE.trim(),
    position: 0,
    wordCount: countWordsFromHtml(PROLOGUE),
    updatedAt: daysAgo(5),
  });
  await db.insert(codexEntries).values([
    {
      projectId: blackwood.id,
      kind: "character",
      name: "Wren Halloway",
      summary: "A collector's daughter who refuses to sell the one memory that's hers.",
      content: "Eleven at the prologue, nineteen across Book I. Reads ledgers upside-down — a skill the haggler taught her before she learned what he'd sold her mother.",
    },
    {
      projectId: blackwood.id,
      kind: "location",
      name: "Blackwood Vale",
      summary: "A valley that barters remembrance like grain, and grows poorer every harvest.",
      content: "Tithe day monthly. The scale-platform at market square. Chimneys breathe out other people's summers.",
    },
  ]);

  /* ---------------- Project C: Static & Other Love Songs ---------------- */
  const [staticC] = await db
    .insert(projects)
    .values({
      userId: user.id,
      title: "Static & Other Love Songs",
      type: "stories",
      genre: "Speculative short fiction",
      status: "complete",
      premise: "Four love stories told at the frequency where human signals blur.",
      targetWordCount: 12000,
      updatedAt: daysAgo(14),
    })
    .returning();
  await db.insert(chapters).values([
    {
      projectId: staticC.id,
      title: "Static",
      content: STATIC.trim(),
      position: 0,
      wordCount: countWordsFromHtml(STATIC),
      updatedAt: daysAgo(14),
    },
    {
      projectId: staticC.id,
      title: "The Cartographers of Small Hours",
      content: SMALL_HOURS.trim(),
      position: 1,
      wordCount: countWordsFromHtml(SMALL_HOURS),
      updatedAt: daysAgo(12),
    },
  ]);
  await db.insert(codexEntries).values({
    projectId: staticC.id,
    kind: "lore",
    name: "The Frequency",
    summary: "The band between stations where the four stories bleed into one another.",
    content: "Each story in the collection tunes the same dial: a station, a street, a signal, a door. The through-line is deliberate — readers are meant to feel the static shared between all four.",
  });

  console.log("Seed complete — open /dashboard and start writing.");
  await pool.end();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("Seed failed:", err);
  await pool.end();
  process.exit(1);
});
