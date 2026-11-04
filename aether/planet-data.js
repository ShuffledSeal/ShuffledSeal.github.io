'use strict';

// Rounded reference values; each field guide links to its NASA fact sheet.
window.AetherPlanetNotes = {
  mercury: {
    heading: 'A long day close to the Sun.',
    intro: 'On Mercury, sunrise to sunrise takes 176 Earth days. The ground can reach 430°C in daylight, yet ice survives in craters that never see the Sun.',
    facts: [['Surface gravity', '3.70 m/s²'], ['Day / night surface', '430 / −180°C'], ['Solar day', '176 Earth days'], ['Axial tilt', '0.034°']],
    chapters: [
      ['An old surface, still contracting', 'Impact craters cover much of Mercury. Between them, long cliffs called lobate scarps record the crust buckling as the planet’s interior cooled and shrank. The Caloris impact basin is roughly 1,550 kilometres across.'],
      ['Three turns in two years', 'Mercury rotates three times for every two trips around the Sun: a 3:2 spin–orbit resonance. Rotation relative to the stars takes 58.6 Earth days. A solar day is much longer because Mercury is also moving rapidly along its orbit.'],
      ['Ice beside the heat', 'Mercury’s axis is almost upright. Sunlight never reaches the floors of some deep polar craters. Radar observations and MESSENGER measurements support the presence of water ice in these permanent cold traps. Its very thin exosphere cannot distribute heat like Earth’s atmosphere.']
    ],
    places: [['Caloris Planitia', 'A huge impact basin, ringed by mountains and partly filled by ancient volcanic plains.'], ['Prokofiev crater', 'A large north-polar crater whose permanently shadowed regions are associated with deposits of water ice.'], ['The iron interior', 'Mercury has an unusually large metallic core, occupying most of its radius.']],
    missions: [['1974–1975', 'Mariner 10', 'Three flybys revealed a cratered surface and an unexpected magnetic field.'], ['2011–2015', 'MESSENGER', 'The first Mercury orbiter mapped the planet and investigated its polar deposits.']],
    observation: 'Mercury stays close to the Sun in our sky. Look near the horizon during a favourable evening or morning elongation, only when the Sun is safely below the horizon. Never sweep near the Sun with binoculars.',
  },
  venus: {
    heading: 'Under the clouds, a very different world.',
    intro: 'Venus is almost Earth’s size. At the surface, though, the temperature is about 465°C and the pressure is roughly 92 times sea-level pressure on Earth.',
    facts: [['Surface gravity', '8.87 m/s²'], ['Surface temperature', '≈ 465°C'], ['Surface pressure', '≈ 92 bar'], ['Atmosphere', '≈ 96.5% CO₂']],
    chapters: [
      ['A greenhouse taken to extremes', 'The thick carbon-dioxide atmosphere traps outgoing infrared radiation. Venus is hotter than Mercury despite being farther from the Sun. Sulfuric-acid cloud droplets obscure the surface in visible light; radar can see through them.'],
      ['A day longer than a year', 'Venus rotates backwards compared with most planets. One sidereal turn takes about 243 Earth days, longer than its 225-day year. Because of the retrograde rotation, a sunrise-to-sunrise day lasts about 117 Earth days.'],
      ['Weather above the furnace', 'The upper clouds travel around Venus in only a few Earth days, much faster than the solid planet turns. Near 50–60 kilometres altitude, conditions are much less extreme than at the ground, although the clouds remain corrosive. The Soviet Vega missions flew balloons in this region in 1985.']
    ],
    places: [['Maxwell Montes', 'The planet’s highest mountain range rises roughly 11 kilometres above its mean surface level.'], ['Maat Mons', 'Radar comparisons show a volcanic vent changed between Magellan observations, evidence of recent volcanic activity.'], ['Tessera terrain', 'Heavily deformed highlands preserve overlapping ridges and grooves; their geological history is still debated.']],
    missions: [['1970', 'Venera 7', 'Returned the first data from the surface of another planet.'], ['1985', 'Vega 1 & 2', 'Balloons measured winds and conditions within the cloud layers.'], ['1990–1994', 'Magellan', 'Radar mapped nearly the entire surface beneath the clouds.']],
    observation: 'Venus is conspicuous before sunrise or after sunset. A telescope shows its changing phases, not its surface. Observe only with the Sun safely below the horizon.',
  },
  earth: {
    heading: 'An ocean planet, measured from home.',
    intro: 'Liquid water covers about 71% of Earth. Its atmosphere, oceans, rocks, and living things exchange energy and material on timescales from seconds to millions of years.',
    facts: [['Surface gravity', '9.81 m/s²'], ['Ocean coverage', '≈ 71%'], ['Axial tilt', '23.44°'], ['Mean Moon distance', '384,400 km']],
    chapters: [
      ['A moving surface', 'Earth’s outer shell is broken into tectonic plates. New crust forms at ocean ridges, while subduction returns material to the interior. These processes reshape continents and help cycle carbon over geological time.'],
      ['Seasons come from tilt', 'Earth’s axis stays approximately pointed in the same direction as it orbits the Sun. A hemisphere tilted toward the Sun receives longer days and more direct sunlight. Earth is actually closest to the Sun in early January, during northern winter.'],
      ['Two clocks in the tides', 'The Moon supplies the largest tidal influence, with the Sun adding another. Near new and full Moon their effects reinforce, producing spring tides. Near the quarter phases the tidal range is smaller: neap tides. Coastlines, water depth, and weather complicate any local prediction.']
    ],
    places: [['Mid-ocean ridges', 'A connected system of underwater mountain chains where plates pull apart and new crust forms.'], ['The magnetosphere', 'Earth’s magnetic field redirects much of the solar wind. Charged particles reaching the polar atmosphere produce auroras.'], ['The atmosphere', 'Dry air near the surface is approximately 78% nitrogen and 21% oxygen, with argon, carbon dioxide, and other gases making up most of the rest.']],
    missions: [['1972 onward', 'Landsat', 'A long-running satellite record of changing forests, farms, cities, and coastlines.'], ['2022 launch', 'SWOT', 'Measures the height of water across much of Earth’s oceans, rivers, and lakes.']],
    observation: 'Watch the shadow of a fixed object at the same time over several weeks. Its changing length records the seasonal change in the Sun’s altitude. Record weather and time with each measurement.',
  },
  mars: {
    heading: 'Follow the evidence of water.',
    intro: 'Mars has dry river channels, layered sediments, and minerals altered by water. Today its thin atmosphere leaves the surface cold, exposed, and difficult to explore.',
    facts: [['Surface gravity', '3.71 m/s²'], ['Mean temperature', '≈ −65°C'], ['Solar day', '24 h 39 min'], ['Surface pressure', '≈ 6 millibar']],
    chapters: [
      ['A landscape shaped by water', 'Ancient valleys and deltas show that water once flowed across parts of Mars. Clay minerals and sedimentary rocks preserve clues to those conditions. Evidence of a habitable environment is not the same as evidence that life existed there.'],
      ['Thin air, difficult landings', 'The atmosphere is mostly carbon dioxide and has less than 1% of Earth’s sea-level pressure. It is thick enough to heat an arriving spacecraft but too thin for a parachute alone to land a heavy rover gently.'],
      ['A rover’s working day', 'A Martian solar day, or sol, is about 39 minutes longer than an Earth day. Rover teams plan drives around slopes, loose sand, power, and communication opportunities. Orbital images help, but the safest route is not always the shortest one.']
    ],
    places: [['Jezero crater', 'An ancient lake basin with a preserved river delta, explored by Perseverance.'], ['Olympus Mons', 'A shield volcano roughly 22 kilometres above the surrounding reference level, built by repeated lava flows.'], ['Valles Marineris', 'A canyon system more than 4,000 kilometres long, associated with crustal stretching and later erosion.']],
    missions: [['1976', 'Viking 1 & 2', 'Landers photographed the surface and carried experiments investigating its chemistry.'], ['2012 landing', 'Curiosity', 'Studies the layered rocks of Gale crater and evidence of past habitable conditions.'], ['2021 landing', 'Perseverance', 'Explores Jezero crater and seals selected rock samples in tubes.']],
    observation: 'Mars varies greatly in apparent size and brightness as its distance from Earth changes. Around a favourable opposition, a telescope may reveal dark markings and a polar cap. A dust storm can obscure them.',
  },
  jupiter: {
    heading: 'Weather on a world without a surface.',
    intro: 'Jupiter’s visible stripes are clouds, not solid ground. Below them, pressure rises through an enormous hydrogen-rich envelope. Four large moons offer four very different places to investigate.',
    facts: [['Cloud-top gravity', '≈ 24.8 m/s²'], ['Rotation', '≈ 9 h 56 min'], ['Mass', '≈ 318 Earths'], ['Main gases', 'Hydrogen & helium']],
    chapters: [
      ['Belts, zones, and a persistent storm', 'Alternating eastward and westward jets separate Jupiter’s cloud bands. The Great Red Spot is a vast anticyclonic storm that has been observed for centuries, though its size and shape change. Jupiter’s rapid rotation helps organise its atmosphere.'],
      ['Four moons, four histories', 'Io is volcanically active; Europa has an icy shell above a likely global ocean. Ganymede is the largest moon in the solar system and has its own magnetic field. Callisto retains an ancient, heavily cratered surface.'],
      ['An orbital rhythm', 'Io, Europa, and Ganymede participate in a 4:2:1 orbital resonance: in roughly the time Ganymede completes one orbit, Europa completes two and Io four. The resulting gravitational interactions help maintain orbital eccentricities and tidal heating.']
    ],
    places: [['Io', 'Tidal flexing powers intense volcanism. Its colourful surface is continually resurfaced.'], ['Europa', 'Fractured ice and a subsurface ocean make it a major target for investigating potentially habitable environments.'], ['The Great Red Spot', 'A long-lived storm in the southern hemisphere; it is not a fixed mark on a solid surface.']],
    missions: [['1979', 'Voyager 1 & 2', 'Revealed active volcanoes on Io and intricate icy terrain on the outer moons.'], ['1995–2003', 'Galileo', 'Orbited Jupiter and deployed a probe into its atmosphere.'], ['2016 arrival', 'Juno', 'Investigates Jupiter’s gravity, magnetic field, deep atmosphere, and polar regions.']],
    observation: 'Steady binoculars can show the four Galilean moons. Sketch their positions and compare on another night. A missing moon may be in front of Jupiter, behind it, or in its shadow.',
  },
  saturn: {
    heading: 'The rings are countless separate orbits.',
    intro: 'Saturn’s rings look continuous from Earth. Up close, they are an enormous, thin swarm of icy particles, each following its own orbit around the planet.',
    facts: [['Cloud-top gravity', '≈ 10.4 m/s²'], ['Mean density', '0.69 g/cm³'], ['Axial tilt', '26.7°'], ['Main ring material', 'Water ice']],
    chapters: [
      ['A disc made of individual pieces', 'Ring particles range from fine grains to large chunks. Inner particles orbit faster than outer ones; a ring is not a rigid wheel. Collisions, moonlets, and resonances create waves, narrow edges, and gaps.'],
      ['Gaps have gravitational causes', 'The Cassini Division separates the bright A and B rings. Its inner edge is associated with an orbital resonance with Mimas. The narrower Encke Gap contains the small moon Pan, which helps maintain the opening.'],
      ['Two moons worth a closer look', 'Titan has a dense nitrogen atmosphere and lakes and seas of liquid methane and ethane. Enceladus ejects water-rich plumes from fractures near its south pole, supplying material to Saturn’s diffuse E ring. Both complicate the idea that a small icy moon must be inactive.']
    ],
    places: [['The A, B, and C rings', 'The principal broad rings, ordered here from outer to inner. Their brightness and optical depth vary.'], ['Enceladus’s south pole', 'Warm fractures called tiger stripes vent material from an ocean beneath the ice.'], ['Titan’s northern lakes', 'Radar observations reveal liquid hydrocarbons on a landscape shaped by a methane weather cycle.']],
    missions: [['1980–1981', 'Voyager 1 & 2', 'Resolved ring structure and studied Titan’s thick haze.'], ['2004–2017', 'Cassini', 'Orbited Saturn for thirteen years, investigating the planet, rings, and moons.'], ['2005', 'Huygens', 'Descended through Titan’s atmosphere and returned images from its surface.']],
    observation: 'A small telescope can separate the rings from Saturn’s disc. Their apparent opening changes as Saturn moves around the Sun. Near a ring-plane crossing, the rings appear exceptionally thin.',
  },
  uranus: {
    heading: 'A planet tipped almost onto its side.',
    intro: 'Uranus’s axis is tilted by about 98°. Over an 84-year orbit, its poles take turns facing the Sun, producing seasons unlike those on any other planet.',
    facts: [['Cloud-top gravity', '≈ 8.7 m/s²'], ['Axial tilt', '97.8°'], ['Year', '≈ 84 Earth years'], ['Cloud-top minimum', '≈ −224°C']],
    chapters: [
      ['Seasons measured in decades', 'Near a solstice, one pole points toward the Sun while the other lies in long darkness. Near an equinox, the Sun crosses the equatorial plane. Each season lasts roughly 21 Earth years. The cause of the extreme tilt is still investigated; a giant collision is one proposed explanation.'],
      ['What “ice giant” means', 'Uranus contains more heavier volatile compounds than Jupiter and Saturn, including water, ammonia, and methane in its interior. These materials are not necessarily ordinary frozen ice under the planet’s extreme pressure. Methane in the atmosphere absorbs red light, contributing to the blue-green appearance.'],
      ['Dark rings and disrupted moons', 'Uranus has a set of narrow, dark rings. Its moons include Miranda, whose patchwork terrain contains huge cliffs and regions of strongly deformed crust. Only one spacecraft has so far visited Uranus: Voyager 2 in 1986.']
    ],
    places: [['Miranda', 'A small moon with strikingly varied terrain, including the large, grooved regions called coronae.'], ['The epsilon ring', 'The brightest and broadest of the main narrow rings, bounded by the shepherd moons Cordelia and Ophelia.'], ['A tilted magnetic field', 'The magnetic axis is strongly inclined to the rotation axis and displaced from the planet’s centre.']],
    missions: [['1781', 'William Herschel', 'Identified Uranus through telescopic observation, expanding the known planetary system.'], ['1986', 'Voyager 2', 'The only spacecraft flyby, returning close views of the planet, rings, and moons.']],
    observation: 'Uranus is faintly visible to the unaided eye under excellent conditions, but binoculars and a good chart are more practical. A telescope shows a small blue-green disc. Compare its position against nearby stars over several nights.',
  },
  neptune: {
    heading: 'Faint sunlight. Fast weather.',
    intro: 'At Neptune, sunlight is roughly one nine-hundredth as intense as it is at Earth. Yet the atmosphere drives some of the fastest winds measured in the solar system.',
    facts: [['Cloud-top gravity', '≈ 11.2 m/s²'], ['Year', '≈ 165 Earth years'], ['Peak measured winds', 'Over 2,000 km/h'], ['Sunlight vs Earth', '≈ 1 / 900']],
    chapters: [
      ['A planet predicted before discovery', 'Discrepancies in Uranus’s observed motion led Urbain Le Verrier and John Couch Adams to calculate the influence of an unseen planet. In 1846, Johann Galle and Heinrich d’Arrest identified Neptune near Le Verrier’s predicted position.'],
      ['Storms that come and go', 'Voyager 2 photographed a Great Dark Spot in 1989. Later Hubble observations found it had vanished, while other dark storms appeared. Bright methane-ice clouds can accompany these weather systems. Neptune also emits more energy than it receives from the Sun.'],
      ['Triton goes the other way', 'Neptune’s largest moon follows a retrograde orbit, opposite the planet’s rotation. This strongly suggests it was captured rather than forming in place. Voyager 2 observed dark geyser-like plumes above Triton’s extremely cold, nitrogen-rich surface.']
    ],
    places: [['The cloud tops', 'Wind speeds are inferred by following features as the atmosphere rotates. Different latitudes need not move together.'], ['Triton', 'A likely captured Kuiper Belt object with an icy surface and a tenuous atmosphere.'], ['The Adams ring', 'Neptune’s faint outer main ring contains arcs: uneven concentrations of ring material.']],
    missions: [['1846', 'Berlin Observatory', 'Galle and d’Arrest identified Neptune after receiving Le Verrier’s prediction.'], ['1989', 'Voyager 2', 'The only spacecraft encounter with Neptune, followed by a close view of Triton.']],
    observation: 'Neptune requires optical aid and a reliable finder chart. In most small telescopes it looks like a very small, faint disc. Several nights of position measurements help distinguish it from background stars.',
  }
};
