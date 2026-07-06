import videojs from "video.js";

async function translate(text) {
  return text;
}

let enableTranslate = false;

export function translatePlugin(options = {}) {
  let oneRun = false;
  this.on('texttrackchange', (e) => {
    if (!enableTranslate) return;
    const tran = () => {
      const el = e.target.getElementsByClassName('vjs-text-track-display')[0];
      if (!el) return;
      const text = el.textContent;
      if (!text) return;
      translate(text).then((res) => {
        const cue = e.target.querySelector('.vjs-text-track-cue div');
        if (cue) cue.append(' ' + res);
      });
    }
    if (!oneRun) {
      oneRun = true;
      setTimeout(tran, 1000);
    } else {
      tran()
    }
  })
  if (options.initRefreshTranslateBtn) {
    refreshTranslateBtn(this);
  }
}

export function refreshTranslateBtn(player, label) {
  const btnText = label || 'Translate';
  setTimeout(() => {
    player.getChild('ControlBar').getChild('SubsCapsButton').children()[1].addChild('textButton', {
      text: btnText,
      seleced: enableTranslate,
      handleClick: (e) => {
        enableTranslate = e.seleced;
      }
    });
  }, 600);
}

let Component = videojs.getComponent('Component');
class TextButton extends Component {

  // The constructor of a component receives two arguments: the
  // player it will be associated with and an object of options.
  constructor(player, options = {}) {
    super(player, options);
    if (options.text) {
      this.updateTextContent(options.text);
      if (options.seleced) {
        this.el_.classList.add('vjs-selected')
      } else {
        this.el_.classList.remove('vjs-selected')
      }
    }
    this.on(['tap', 'click'], function () {

      // this.el_.setAttribute('class', 'vjs-selected');
      options.seleced = !options.seleced;
      if (options.seleced) {
        this.el_.classList.add('vjs-selected');
      } else {
        this.el_.classList.remove('vjs-selected');
      }
      (options.handleClick || this.handleClick)(options);
    });
  }

  // The `createEl` function of a component creates its DOM element.
  createEl() {
    return videojs.dom.createEl('li', {

      // Prefixing classes of elements within a player with "vjs-" 
      // is a convention used in Video.js.
      className: 'vjs-menu-item custom-cursor-on-hover'
    });
  }

  handleClick(e) {
    // handled by options.handleClick
  }

  // This function could be called at any time to update the text 
  // contents of the component.
  updateTextContent(text) {

    // If no text was provided, default to "Title Unknown"
    if (typeof text !== 'string') {
      text = 'Title Unknown';
    }

    // Use Video.js utility DOM methods to manipulate the content
    // of the component's element.
    videojs.emptyEl(this.el());
    videojs.appendContent(this.el(), text);
  }
}
videojs.registerComponent('textButton', TextButton);
