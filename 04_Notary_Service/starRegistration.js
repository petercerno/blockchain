/**
 * Class representing a star.
 *
 * @class Star
 */
class Star {
  /**
   * Creates an instance of Star.
   *
   * @param {string} right_ascension Right Ascension.
   * @param {string} declination Declination.
   * @param {string} magnitude Magnitude.
   * @param {string} constellation Constellation.
   * @param {string} star_story_encoded Hex encoded Ascii string of Star story.
   * @memberof Star
   */
  constructor(right_ascension, declination,
    magnitude, constellation, star_story_encoded) {
    this.ra = right_ascension;
    this.dec = declination;
    if (magnitude) { this.mag = magnitude; }
    if (constellation) { this.cen = constellation; }
    this.story = star_story_encoded;
  }

  /**
   * Parses the star dictionary from the request and returns a Star object.
   * Throws an error if any of the required parameters are missing or invalid.
   *
   * @static
   * @param {Object} star_dict Star dictionary.
   * @returns {Star} Star object.
   * @memberof Star
   */
  static parseDict(star_dict) {
    if (!star_dict['ra']) {
      throw new Error('Missing Right Ascension!');
    }
    let right_ascension = star_dict['ra'];
    if (!star_dict['dec']) {
      throw new Error('Missing Declination!');
    }
    let declination = star_dict['dec'];
    if (!star_dict['story']) {
      throw new Error('Missing Star Story!');
    }
    let magnitude = star_dict['mag'];
    let constellation = star_dict['cen'];
    let star_story_encoded = Buffer.from(
      star_dict['story'], 'utf8').toString('hex');
    if (star_story_encoded.length > 500) {
      throw new Error('Encoded Star Story Exceeds 500 Bytes!');
    }
    return new Star(right_ascension, declination,
      magnitude, constellation, star_story_encoded);
  }
}

module.exports = {
  Star: Star,
};