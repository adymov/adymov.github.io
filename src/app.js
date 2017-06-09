
;(function ($) {
  var
    // menu
    menuCards = $('.confirm-card__menu'),
    userCards = menuCards.find('.confirm-card__item--user-card'),
    addCard = menuCards.find('.confirm-card__item--add-new'),

    // wrappers
    grid = $('.confirm-card__grid'),
    confirmWrapper = $('.confirm-form__wrapper'),

    // cards
    cardFront = $('.card.card--front'),
    cardBack = $('.card.card--back'),
    cardsMini = $('.card--mini'),
    emptyCard = $('.card--empty-card'),

    // fields
    fieldCCV = cardBack.find('.card__field--ccv'),
    fieldPancode = cardFront.find('.card__field--number'),
    fieldDate = cardFront.find('.card__field--date'),
    codeConfirm = $('.card__code-confirm'),
    dataSafeHint = $('.confirm-form__hint:not(.confirm-form__hint--back-card)').first(),
    codeHintError = $('.confirm-form__code-error'),
    fieldCode = $('.card__field--code'),

    // bittons
    checkboxAgree = $('#checkAgree'),
    btnPayment = $('#btnPayment'),
    btnCodeSubmit = $('#btnCodeSubmit'),
    btnSuccess = $('#btnSuccess'),

    // states
    cardType = cardFront.attr('data-type'),
    cardTypes = {
      maestro: new RegExp(/^(50[0-9][0-9][0-9][0-9]|56[0-9][0-9][0-9][0-9]|6[0-9][0-9][0-9][0-9][0-9])\d*$/),
      visa: new RegExp(/^4\d*$/),
      mastercard: new RegExp(/^5[1-5]\d*$/),
      // mir: new RegExp(/^220[1-4]\d*$/),
    },

    KEYS = {
      BACKSPACE: 8, TAB: 9, DELETE: 46, INSERT: 45, SHIFT: 16, CTRL: 17, ALT: 18,
      F1: 112, F2: 113, F3: 114, F4: 115, F5: 116, F6: 117, F7: 118, F8: 119, F9: 120, F10: 121, F11: 122, F12: 123,
      PAD0: 96, PAD1: 97, PAD2: 98, PAD3: 99, PAD4: 100, PAD5: 101, PAD6: 102, PAD7: 103, PAD8: 104, PAD9: 105,
      NUM0: 48, NUM1: 49, NUM2: 50, NUM3: 51, NUM4: 52, NUM5: 53, NUM6: 54, NUM7: 55, NUM8: 56, NUM9: 57,
      PAGEUP: 33, PAGEDOWN: 34, END: 35, HOME: 36, LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40,
      X: 88, C: 67, V: 86, Z: 90, A: 65,
    },

    secondStep = $('.stepper__wrapper > *:nth-child(2)'),

    // date
    date = new Date(),
    rowYear = trsfLoadData.date_year ? trsfLoadData.date_year : date.getFullYear().toString(),
    rowMonth = trsfLoadData.date_month ? trsfLoadData.date_month : date.getMonth(),
    month = parseInt(rowMonth, 10),
    year = parseInt(rowYear.slice(-2), 10),

    // hidden form ajax
    formRequestHidden = $('#requestHidden'),
    formRequestHiddenMD = $('#requestHidden input[name="MD"]'),
    formRequestHiddenPaReq = $('#requestHidden input[name="PaReq"]'),
    formRequestHiddenTermUrl = $('#requestHidden input[name="TermUrl"]'),
    // _root = '/static/market/';
    _root = '../public/';



  function Validator () { }

  /**
   *  Validate cards with Lun algorithm
   *  @param {string} pancode - card pancode
   *  @return {boolean} - valid or not
   */
  Validator.prototype.validateCardLun = function (pancode) {
    if (/[^0-9-\s]+/.test(pancode) && pancode.length < 1) return false;
    var nCheck = 0,
      bEven = false;

    pancode = pancode.replace(/\D/g, '');

    for (var n = pancode.length - 1; n >= 0; n--) {
      var cDigit = pancode.charAt(n),
        nDigit = parseInt(cDigit, 10);
      if (bEven) {
        if ((nDigit *= 2) > 9) { nDigit -= 9; }
      }
      nCheck += nDigit;
      bEven = !bEven;
    }
    return (nCheck % 10) === 0;
  };


  /**
   *  Check valid all card fields:
   *  1. pancode
   *  2. ccv
   *  3. date
   *  changes cardState valid.
   *  @param {event} e - event object
   *  @return {boolean} - valid or not
   */
  Validator.prototype.validateField = function (e) {
    var value,
      valid = false,
      validLun = false,
      type = $(this).attr('data-type'),
      inputDates = $(this).val().split(' / '),
      userYear = +inputDates[1],
      userMonth = +inputDates[0];

    if (type === 'pancode') {
      value = $(this).val().replace(/\D/g, '');
      if (value.length > 0) {
        validLun = Validator.validateCardLun(value);
        valid = (validLun && cardType !== 'none');
      } else {
        valid = false;
      }

      // if true -> this card not supports
      // else -> card not valid
      if (!valid) {
        var errormsg = (validLun)
          ? 'Эта карта не поддерживается'
          : 'Ошибка в номере карты';

        $(this).next('.card__error')
          .find('span')
          .html(errormsg);
      }

      Card.setState({ validPan: valid });
    }

    if (type === 'date') {
      var validYear = (userYear > year && userYear < 100);
      var validMonth = (0 < userMonth && userMonth <= 12);
      var validThisYear = ((userYear === year) && (userMonth > month && userMonth <= 12));

      valid = (validThisYear || (validYear && validMonth));

      // valid date
      if (!valid) {
        var errormsg = (validMonth)
          ? 'Эта карта просрочена.'
          : 'Дата написана с ошибкой';

        $(this).next('.card__error')
          .find('span')
          .html(errormsg);
      }
      Card.setState({ validDat: valid });
    }

    if (type === 'ccv') {
      valid = ((cardType === 'maestro' && (3 < $(this).val().length) && ($(this).val().length < 5)) || (cardType !== 'maestro' && $(this).val().length === 3));

      Card.setState({ validCVV: valid });
    }

    if (valid) {
      $(this).removeClass('card__field--error');
      $(this).addClass('card__field--success');
    } else {
      $(this).removeClass('card__field--success');

      if ($(this).val().length > 0) {
        $(this).addClass('card__field--error')
          .next('.card__error')
          .show();
      }
    }

    return true;
  };

  /**
   *  Validate all fields in form and enable/disable button submit
   *  @param {event} e - event object
   */
  Validator.prototype.validateForm = function (e) {
    Card.setState({ agree: checkboxAgree.is(':checked') });
    var cardState = Card.getState();

    if (cardState.agree && ((cardState.validDat && cardState.validPan && cardState.validCVV) || cardState.saved)) {
      $('.card--anim-present-a').css('position', 'relative');
      btnPayment.removeClass('confirm-blue--disabled');

      var submitHandlers = $._data(btnPayment[0], "events");

      if (submitHandlers !== undefined) {
          var checkPaymentEvent = false;
          var checkFirstPaymentEvent = false;
          // off events
          submitHandlers.click.forEach(function (item) {
              if (item.handler.name === "paymentCard")
                checkPaymentEvent = true;
              else if (item.handler.name === "fstSubmit")
                checkFirstPaymentEvent = true;
          });

          if (checkPaymentEvent)      btnPayment.off('click', Payment.paymentCard);
          if (checkFirstPaymentEvent) btnPayment.off('click', Layout.animateCardsToConfirm);
      }

      btnPayment.on('click', Payment.paymentCard);
      btnPayment.on('click', Layout.animateCardsToConfirm);
    } else {
      btnPayment.addClass('confirm-blue--disabled');
      btnPayment.off('click');
    }
  };

  /**
   *  Controlling Field states.
   *  Method checks current field state and changes it,
   *  if field was filled.
   *  @param {event} e - keyup event
   *  @return {boolean} - is valid key or not
   */
  Validator.prototype.validateKey = function (e) {
    var key = e.which,
      inputType,
      value;

    if (!validateSymbol(e)) return false;

    inputType = $(this).attr('data-type');
    value = $(this).val().replace(/\D/g, '');

    $(this)
      .removeClass('card__field--success')
      .removeClass('card__field--error')
      .next('.card__error').hide();

    codeHintError.addClass('confirm-form__code-error--off');

    // if input data is key-combination -> select
    if (!isSimpleKey(e)) {
      $(this).select();
      return true;
    } else {
      // else if input key is simple value (without ctrl/shift combination)
      // -> return true when this input field fully filled.
      return !(isSimpleKey(e) && !isUtilKey(e) && ((inputType === 'date' && value.length >= 4)
       || (inputType === 'ccv' && (cardType === 'maestro' && value.length >= 4))
       || (inputType === 'ccv' && (cardType !== 'maestro' && value.length >= 3))
       || (inputType === 'pancode' && (cardType !== 'maestro' && value.length >= 16))
       || (inputType === 'pancode' && (cardType === 'maestro' && value.length >= 19))));
    }
  };

  /**
   *  Keyup event handler on Pancode field.
   *  Checking pancode and formatting (canonize value and paste into field) with methods.
   *  @param {string} e - keyup event
   */
  Validator.prototype.pancodeHandler = function (e) {
    var pancode = $(this).val(),
      provider;

    pancode = pancode.replace(/\D/g, '');
    provider = Card.isCard(pancode);
    if (cardType !== cardFront.attr('data-type')) {
      cardType = provider;
      Card.selectLogo(provider);
    }

    var cursorPos = getCursorPosition(this);
    pancode = Card.canonizePan(pancode);

    if (/(\d)/g.test(String.fromCharCode(e.which)) || (e.which >= KEYS.PAD0 && e.which <= KEYS.PAD9)) {
        if (pancode[cursorPos - 1] === ' ') cursorPos++;
        $(this).val(pancode);
        this.setSelectionRange(cursorPos, cursorPos);
    }
  };

  /**
   *  Keyup event handler on Date field.
   *  Checking valid date and formatting.
   *  @param {string} e - keyup event
   */
  Validator.prototype.dateHandler = function (e) {
    var
      key = e.which,
      value = $(this).val(),
      cursorPos = getCursorPosition(this);

    if (/(\d)/g.test(String.fromCharCode(key)) || (key >= KEYS.PAD0 && key <= KEYS.PAD9))
      $(this).val(Card.canonizeDate(value));
  };

  /**
   *  sms code field for confirmation user.
   *  @param {string} e - keyup event
   */
  Validator.prototype.codeHandler = function (e) {
    var code = $(this).val().replace(/\D/g, '');

    if ((code.length >= 4) && (/(\d)/g.test(String.fromCharCode(e.which)))) {
      Request.codeSubmit();
    }
  };




  function Card() {
    this.pancode = '';
    this.cvv = '';
    this.expire = '';
    this.id = '';
    this.saved = false;
    this.agree = false;
    this.validPan = false;
    this.validDat = false;
    this.validCVV = false;
  }

  /**
   *  Gets actual state of card.
   *  @return {string} object - state object.
   */
  Card.prototype.getState = function () {
    return {
      pancode: this.pancode,
      cvv: this.cvv,
      expire: this.expire,
      id: this.id,
      saved: this.saved,
      agree: this.agree,
      validPan: this.validPan,
      validDat: this.validDat,
      validCVV: this.validCVV,
    }
  };

  /**
   *  Sets new state to Card.
   *  @param {string} state - new state object
   */
  Card.prototype.setState = function (state) {
    this.pancode  = state.pancode  !== undefined ? state.pancode  : this.pancode;
    this.cvv      = state.cvv      !== undefined ? state.cvv      : this.cvv;
    this.expire   = state.expire   !== undefined ? state.expire   : this.expire;
    this.id       = state.id       !== undefined ? state.id       : this.id;
    this.saved    = state.saved    !== undefined ? state.saved    : this.saved;
    this.agree    = state.agree    !== undefined ? state.agree    : this.agree;
    this.validPan = state.validPan !== undefined ? state.validPan : this.validPan;
    this.validDat = state.validDat !== undefined ? state.validDat : this.validDat;
    this.validCVV = state.validCVV !== undefined ? state.validCVV : this.validCVV;
  };

  Card.prototype.checkState = function () { };

  /**
   *  Reset card state to default.
   */
  Card.prototype.resetState = function () {
    this.pancode = '';
    this.cvv = '';
    this.expire = '';
    this.id = '';
    this.saved = false;
    this.agree = false;
    this.validPan = false;
    this.validDat = false;
    this.validCVV = false;
  };


  /**
   *  Card type definition by regexp and set card type
   *  @param {string} pancode - card pancode
   *  @return {string} provider - name of card provider
   */
  Card.prototype.isCard = function (pancode) {
    var provider;
    if (cardTypes.visa.test(pancode)) {
      provider = 'visa';
    } else if (cardTypes.maestro.test(pancode)) {
      provider = 'maestro';
    } else if (cardTypes.mastercard.test(pancode)) {
      provider = 'mastercard';
    } else {
      provider = 'none';
    }

    cardFront.attr('data-type', provider);
    return provider;
  };

  /**
   *  Card pancode canonization by 2 types:
   *  1. all cards using mask: **** **** **** ****
   *  2. maestro cards using mask: ******** **********
   *  @param {string} pancode - card pancode
   *  @return {string} - pretty canonized pancode
   */
  Card.prototype.canonizePan = function (pancode) {
    var pnSplit,
      expr, pn, res;

    if (cardType === 'maestro') {
      expr = /^(\d{1,8})(\d{0,11})?/;
      res = pancode.match(expr);

      pnSplit = (res[2] !== undefined)
                ? res.slice(1, 3)
                : res.slice(1, 2);
    } else {
      expr = /(\d{1,4})/gi;
      pnSplit = pancode.match(expr);
    }

    // insert emprty symbol between pancode parts
    pn = (pnSplit !== null)
      ? pnSplit.join(' ')
      : pancode;

    return pn;
  };

  /**
   *  Card date canonization: MM / YY
   *  @param {string} date - value from date field
   *  @return {string} - pretty canonized date
   */
  Card.prototype.canonizeDate = function (date) {
    var expression = /^(\d{2})(\D+)?(\d{1,2})?$/,
      matched = date.match(expression),
      result;

    result = (matched !== null && !(~matched[0].indexOf(' / ')))
      ? matched[1] + ' / '
      : date;

    return result;
  };

  /**
   *  Show provider logo in card view.
   *  Make selected item big and hide others.
   *  Check user-case:
   *    change card type from maestro (4 numbers in CCV)
   *    to another (3 numbers in CCV).
   *  @param {string} provider - name of card provider
   */
  Card.prototype.selectLogo = function (provider) {
    var cardsLogo = $('.card.card--front .card__provider');

    // auto-correct maxlength ccv field. (from 4 to 3 length)
    if (cardType !== 'maestro' && fieldCCV.val().length > 3) {
      fieldCCV.val(fieldCCV.val().substr(0, 3));
    }
    cardsLogo.each(function () {
      if (cardType === 'none') {
        $(this).removeClass('card__provider--off');
        $(this).removeClass('card__provider--large');
      } else if ($(this).attr('data-provider') === provider) {
        $(this).addClass('card__provider--large');
      } else {
        $(this).addClass('card__provider--off');
      }
    });
  };


  /**
   *  Select mini card (in the card grid)
   *  and growth scale, change cardStates.
   *  @param {string} e - click event
   */
  Card.prototype.selectCard = function (e) {
    var pancode = $(this).find('.card__field--number').val(),
      idCard = $(this).find('input[name="card_id"]').val(),
      displayNone = { display: 'none' },
      hideOpacity = { opacity: 0 },
      selectedCard = $(this);

    // set states for auth by saved card
    Card.setState({ pancode: pancode, saved: true, id: idCard });

    grid.addClass('confirm-card__grid--anim-present');

    selectedCard.parent().parent()
      .addClass('confirm-card__column--anim-present');

    selectedCard
      .css('display', 'block')
      .addClass('card--anim-present-a')
      .removeClass('card--mini')
      .find('.card__input--mini')
      .removeClass('card__input--mini');

    selectedCard
      .find('.card__logo-bank--mini')
      .removeClass('card__logo-bank--mini');

    selectedCard
      .find('.card__provider_wrapper')
      .addClass('card__provider_wrapper--default')
      .removeClass('card__provider_wrapper--mini')

    selectedCard
      .find('.card__provider')
      .addClass('card__provider--large');

    selectedCard
      .find('.card__field--number')
      .removeClass('card__field--mini');

    selectedCard.nextAll().css(hideOpacity);
    selectedCard.prevAll().css(hideOpacity);

    selectedCard
      .parent('.confirm-card__column')
      .nextAll('.confirm-card__column').css(hideOpacity);

    selectedCard
      .parent('.confirm-card__column')
      .prevAll('.confirm-card__column').css(hideOpacity);

    selectedCard.parent().parent().find('.card--empty-card').css(displayNone);
    selectedCard.parent().parent().nextAll('.confirm-card__column').each(function () {
      $(this).css(displayNone);
    });
    selectedCard.parent().parent().prevAll('.confirm-card__column').each(function () {
      $(this).css(displayNone);
    });
    selectedCard.parent().prevAll().find('.card--mini').each(function () {
      $(this).css(displayNone);
    });
    selectedCard.parent().nextAll().find('.card--mini').each(function () {
      $(this).css(displayNone);
    });

    if (checkboxAgree.is(':checked')) {
      btnPayment.removeClass('confirm-blue--disabled');
      btnPayment.on('click', Payment.paymentCard);
    }

    dataSafeHint.addClass('confirm-form__hint--off');
  };

  /**
   *  Pass focus to next card field.
   *  @param {boolean} e - blur event
   */
  Card.prototype.changeFocus = function (e) {
    var key = e.which,
        value = $(this).val().replace(/\D/g, ''),
        inputType = $(this).attr('data-type'),
        // only fields from frontCard that haven't success state
        emptyInputs = $('.confirm-card__single-card  .card__field:not(.card__field--code):not(.card__field--success)');

    // find next field for focus (from array of empty fields or fileds with error state)
    function selectNextFocus() {
      if (emptyInputs.length < 1) {
        btnPayment.focus();
      } else {
        emptyInputs.each(function (index) {
          // select next empty field or select on first  field with error state.
          if ($(this).attr('data-type') === inputType && emptyInputs[index + 1] !== undefined) {
            emptyInputs[index + 1].select();
            return false; // break;
          } else if (emptyInputs[index + 1] === undefined) {
            var errorFields = $('.confirm-card__single-card  .card__field--error');

            if (errorFields.length > 0) {
              errorFields.first().focus().select();
            } else {
              btnPayment.select();
            }
          }
        });
      }
    }

    // additional check for maestro ccv (code) equals 3
    if (inputType === 'ccv' && (cardType === 'maestro' && value.length === 3)) {
      Validator.validateField.call(this);
      var errorFields = $('.confirm-card__single-card  .card__field--error');

      if (errorFields.length > 0) {
          errorFields.first().focus().select();
      } else {
          Validator.validateForm.call(this);
      }
    }

    // if current input was filled
    if (((inputType === 'date' && value.length >= 4)
      || (inputType === 'ccv' && (cardType === 'maestro' && value.length >= 4))
      || (inputType === 'ccv' && (cardType !== 'maestro' && value.length >= 3))
      || (inputType === 'pancode' && (cardType !== 'maestro' && value.length >= 16))
      || (inputType === 'pancode' && (cardType === 'maestro' && value.length >= 19)))
      && ( (key < KEYS.PAGEUP || KEYS.DOWN < key)
        && (key < KEYS.INSERT || KEYS.DELETE < key)
        && (key < KEYS.SHIFT  || KEYS.ALT < key)
        &&  key !== KEYS.A && key !== KEYS.C)
      )
    {
      selectNextFocus();
    }
    return true;
  };







  function Layout() { }

  /**
   *  Method generates grid of cards.
   *  1. creates mini cards
   *  2. creates columns (vertical grid)
   *  @param {Object} response - list of cards
   */
  Layout.prototype.generateCardGrid = function (response) {
    var itemCard, type, provider, pancode;

    grid.html('<div class="confirm-card__column"></div>');

    if (response.result) {
      response.list.push({
        card_type: 'empty',
      });
      response.list.forEach(function (item, i) {

        // generate hidden pancode style
        if (item.card_type !== 'empty') {
          type = Card.isCard(item.pan[0]);
          pancode = (type !== 'maestro')
             ? Card.canonizePan(item.pan[0].toString() + '000000' + item.pan[1].toString())
             : Card.canonizePan(item.pan[0].toString() + '000000000' + item.pan[1].toString());

          pancode = pancode.slice(0, 7) + pancode.slice(7, -4).replace(/0/gi, '\u2022') + pancode.slice(-4);

          itemCard = $('<div/>', {
            class: 'card  card--mini',
            click: Card.selectCard,
          });

          var logoBank = $('<div/>', {
            class: 'card__logo-bank  card__logo-bank--mini'
          }).appendTo(itemCard);

          $('<input/>', {
            class: 'card__field  card__field--number  card__field--present  card__field--mini',
            type: 'text',
            name: 'pancode',
            value: pancode,
            readonly: 'readonly'
          }).appendTo(
            $('<div/>', {
              class: 'card__input  card__input--card-present  card__input--mini',
            }).appendTo(itemCard)
          );

          var imgc;
          if (type === 'visa') {
            imgc = 'visa-blue.svg';
          } else if (type === 'maestro') {
            imgc = 'maestro.svg';
          } else if (type === 'mastercard') {
            imgc = 'm-c.svg';
          }

          $('<img/>', {
            class: 'card__provider',
            src: _root + 'image/' + imgc,
          }).appendTo(
            $('<div/>', {
              class: 'card__provider_wrapper ' + ' card__provider_wrapper--mini',
            }).appendTo(itemCard)
          );

          $('<input/>', {
            type: 'hidden',
            name: 'card_id',
            value: item.id,
          }).appendTo(itemCard)
        } else {
          itemCard = $('<div/>', {
            class: 'card  card--mini  card--empty-card',
            click: Layout.showAddCard,
          });

          $('<div/>', {
            class: 'empty-card__plus',
          }).appendTo(itemCard);
        }

        // wrappers
        var column;

        if ((i - 1) % 2 === 1) {
          column = $('<div/>', {
            class: 'confirm-card__column',
          });
        } else {
          column = $('.confirm-card__column:last-child');
        }

        itemCard.appendTo($('<div/>', {
          class: 'confirm-card__relative-w',
        }).appendTo(column));

        grid.append(column);
      });
    }
  };

  /**
   *  Switch to "Add new card" Window.
   */
  Layout.prototype.showAddCard = function () {
    grid.addClass('confirm-card__grid--off');
    addCard.addClass('confirm-card__item--active');
    userCards.removeClass('confirm-card__item--active');

    dataSafeHint.removeClass('confirm-form__hint--off');
    fieldPancode.removeClass('card__field--present');
    fieldPancode.removeAttr('readonly');

    cardFront.removeClass('card--off');
    cardBack.removeClass('card--off');
    btnPayment.addClass('confirm-blue--disabled');

    fieldCCV.on('blur', Validator.validateField);
    fieldPancode.on('blur', Validator.validateField);
    fieldDate.on('blur', Validator.validateField);

    fieldCCV.on('blur', Validator.validateForm);
    fieldPancode.on('blur', Validator.validateForm);
    fieldDate.on('blur', Validator.validateForm);

    Card.setState({ saved: false });
    btnPayment.off('click');
    fieldPancode.focus();
  };


  /**
   *  Switch to "My cards" Window.
   *  - Resets cardStates to default yet.
   *  @return {Object} response - list of cards
   */
  Layout.prototype.goUserCards = function () {
    var largeContainer = $('.confirm-card__large-container'),
      paySuccess = $('.pay-success'),
      checkLabel = $('.confirm-form__label'),
      presentCard = $('.card--anim-present-a');

    // set state to default
    Card.resetState();

    btnPayment.addClass('confirm-blue--disabled');
    btnPayment.removeClass('confirm-blue--anim-hidden');
    btnPayment.off('click');

    // confirm-form__wrapper--code-confirm

    menuCards.removeClass('confirm-card__menu--off');
    menuCards.removeClass('confirm-card__menu--anim-hidden');
    menuCards.removeAttr('style');

    grid.removeClass('confirm-card__grid--off');
    grid.removeClass('confirm-card__grid--anim-present');

    userCards.addClass('confirm-card__item--active');
    addCard.removeClass('confirm-card__item--active');

    largeContainer.removeClass('confirm-card__large-container--anim-hidden');
    confirmWrapper.removeClass('confirm-form__wrapper--success');
    confirmWrapper.removeClass('confirm-form__wrapper--code-confirm');
    paySuccess.removeClass('pay-success--anim-show');
    codeConfirm.addClass('card__code-confirm--off');

    checkLabel.switchClass('confirm-form__label--anim-hidden', 400, 'easeInOutSine');
    checkLabel.removeAttr('style');

    cardFront.addClass('card--off');
    cardBack.addClass('card--off');

    if (presentCard !== null) {
      presentCard
        .removeClass('card--anim-present-a')
        .addClass('card--mini')
        .find('.card__logo-bank')
        .addClass('card__logo-bank--mini');

      presentCard.find('.card__input').addClass('card__input--mini');

      presentCard.find('card__field--number').addClass('card__field--mini');
      presentCard.find('card__provider').removeClass('card__provider--large');
    }


    var cardsMini = $('.card--mini');

    cardsMini.parent().parent().removeClass('confirm-card__column--anim-present');
    cardsMini.find('.card__logo-bank').addClass('card__logo-bank--mini');
    cardsMini.find('.card__input').addClass('card__input--mini');
    cardsMini.find('.card__field--number').addClass('card__field--mini');
    cardsMini.find('.card__field--number').addClass('card__field--present');
    cardsMini.find('.card__field--number').attr('readonly', 'readonly');

    cardsMini.find('.card__provider_wrapper').addClass('card__provider_wrapper--mini');
    cardsMini.find('.card__provider_wrapper').removeClass('card__provider_wrapper--default');

    cardsMini.removeAttr('style');
    $('.confirm-card__column').removeAttr('style');

    cardsMini.find('.card__provider').removeClass('card__provider--large');
    dataSafeHint.addClass('confirm-form__hint--off');

    fieldCCV.off('blur');
    fieldPancode.off('blur');
    fieldDate.off('blur');
  };

  /**
   *  Return to step 2 (default step).
   *  @param {Event} e - click event
   */
  Layout.prototype.nextStep = function (e) {

    // remove action from breadcrubms
    secondStep.off('click', Layout.nextStep);

    var cardState = Card.getState();

    if (!!cardState.id) Request.getSavedCards();
    else Layout.animateCardsConfirmReverse();

    var steps = $('.stepper__wrapper > *');

    $(steps[1]).addClass('stepper__name--active');
    $(steps[2])
        .removeClass('stepper__name--active')
        .addClass('stepper__name--disable');
    $(steps[3])
        .removeClass('stepper__name--active')
        .addClass('stepper__name--disable');
  };

  /**
   *  Change "add new card" layout view from step 2, to step 3.
   *  With card animation.
   *  - change cardStates.
   */
  Layout.prototype.animateCardsToConfirm = function () {
    var cardState = Card.getState();

    // if new card;
    if (!cardState.saved) {
      Card.setState({
        expire: fieldDate.val().replace(/\D/g, ''),
        pancode: fieldPancode.val().replace(/\D/g, ''),
        cvv: fieldCCV.val().replace(/\D/g, '')
      });

      fieldCCV.off('blur');
      fieldPancode.off('blur');
      fieldDate.off('blur');

      // animate front card with back card
      cardFront.addClass('card--anim-present', 400, 'easeInOutSine');
      cardBack.addClass('card--present-back', 400, 'easeInOutSine');

      setTimeout(function () {
        cardFront.addClass('card--rotate1', 70, 'easeInOutSine');
        cardFront.find('.card__provider_wrapper').css('display', 'none');
        cardFront.find('.card__input').addClass('card__input--card-present');
      }, 400);

      setTimeout(function () {
        cardFront.addClass('card--rotate2', 70, 'easeInOutSine');
        cardFront.find('.card__title').addClass('card__title--anim-minimize');
        fieldDate.addClass('card__field--anim-hidden');

        fieldPancode.addClass('card__field--present');
        fieldPancode.attr('readonly', 'readonly');
        fieldPancode.removeClass('card__field--error');
        fieldPancode.removeClass('card__field--success');
        dataSafeHint.addClass('confirm-form__hint--off');
      }, 470);

      setTimeout(function () {
        cardFront.find('.card__provider_wrapper').css('display', 'inline-block');
      }, 550);
    }

    // add action for returning to 2nd step.
    secondStep.on('click',Layout.nextStep);

    // hide menu and hints
    $('.confirm-form__wrapper > .confirm-form__hint')
      .addClass('confirm-form__hint--anim-hidden', 250, 'linear');

    menuCards.addClass('confirm-card__menu--anim-hidden', 250, 'linear');
    menuCards.css('display', 'none');

    confirmWrapper
      .addClass('confirm-form__wrapper--code-confirm', 400, 'easeInOutSine');

    // hide checkbox and button submit
    btnPayment.addClass('confirm-blue--anim-hidden', 400, 'easeInOutSine');
    $('.confirm-form__label')
      .addClass('confirm-form__label--anim-hidden', 400, 'easeInOutSine');


  };


  /**
   *  Return to step 2 (default step) from step 3 (smscode).
   *  Only to "add new card" layout state.
   *  it's reverse animation of new cards.
   */
  Layout.prototype.animateCardsConfirmReverse = function () {
    /**
     * animate front card with back card
     */

    // if using saved card (not new card)
    var cardState = Card.getState();
    if (!!cardState.id) return false;

    cardFront.switchClass('card--anim-present', '', 400, 'easeInOutQuad');
    cardBack.switchClass('card--present-back', '', 400, 'easeInOutQuad');

    fieldPancode.css('background-image', 'none')
            .on('blur', Validator.validateForm)
            .on('blur', Validator.validateField)
            .switchClass('card__field--present', '', 400, 'easeInOutQuad')
            .switchClass('card__field--error', '', 1, 'easeInOutQuad')
            .switchClass('card__field--success', '', 1, 'easeInOutQuad')
            .removeAttr('readonly')
            .val('');

    fieldCCV.removeClass('card__field--error')
            .removeClass('card__field--success')
            .on('blur', Validator.validateField)
            .on('blur', Validator.validateForm)
            .val('');

    fieldCode.removeClass('card__field--error')
            .val('');

    fieldDate.switchClass('card__field--anim-hidden', '', 400, 'easeInOutQuad')
             .removeClass('card__field--error')
             .removeClass('card__field--success')
             .on('blur', Validator.validateField)
             .on('blur', Validator.validateForm)
             .val('');

    /**
     * hide menu and hints
     */
    $('.confirm-form__wrapper > .confirm-form__hint')
      .switchClass('confirm-form__hint--anim-hidden', '', 400, 'easeInOutQuad');

    menuCards.switchClass('confirm-card__menu--anim-hidden', '', 400, 'easeInOutQuad');

    confirmWrapper.switchClass('confirm-form__wrapper--code-confirm', '', 400, 'easeInOutQuad');

     /**
      * hide checkbox and button submit
      */
    btnPayment.removeClass('confirm-blue--anim-hidden');
    btnPayment.removeClass('confirm-blue--in-progress');
    $('.confirm-form__label').switchClass('confirm-form__label--anim-hidden', '', 400, 'easeInOutQuad');

    cardFront.switchClass('card--rotate1', '', 400, 'easeInOutQuad')
             .switchClass('card--rotate2', '', 400, 'easeInOutQuad');

    cardFront.find('.card__provider_wrapper').removeAttr('display');
    cardFront.find('.card__input')
      .switchClass('card__input--card-present', '', 400, 'easeInOutQuad');
    cardFront.find('.card__title')
      .switchClass('card__title--anim-minimize', '', 400, 'easeInOutQuad');

    fieldDate.switchClass('card__field--anim-hidden', '', 400, 'easeInOutQuad');

    fieldPancode.switchClass('card__field--present', '', 400, 'easeInOutQuad')
            .removeAttr('readonly', 'readonly')
            .addClass('card__field--error')
            .addClass('card__field--success');
    dataSafeHint.switchClass('confirm-form__hint--off', '', 400, 'easeInOutQuad');

    cardFront.find('.card__provider_wrapper').css('display', 'none');

    menuCards.switchClass('confirm-card__menu--anim-hidden', '', 400, 'easeInOutQuad');
    menuCards.switchClass('confirm-card__menu--off', '', 400, 'easeInOutQuad');

    addCard.addClass('confirm-card__item--active');
    userCards.switchClass('confirm-card__item--active', '', 400, 'easeInOutQuad');

    $('.confirm-card__large-container')
      .switchClass('confirm-card__large-container--anim-hidden', '', 400, 'easeInOutQuad');
    confirmWrapper.switchClass('confirm-form__wrapper--success', '', 400, 'easeInOutQuad');

    $('.confirm-form__label')
      .switchClass('confirm-form__label--anim-hidden', '', 400, 'easeInOutQuad');

    cardFront.switchClass('card--anim-present', '', 400, 'easeInOutQuad');
    cardFront.switchClass('card--rotate1', '', 400, 'easeInOutQuad');
    cardFront.switchClass('card--rotate2', '', 400, 'easeInOutQuad');
    cardFront.switchClass('card--off', '', 400, 'easeInOutQuad');

    cardBack.css('display', 'block')
        .switchClass('card--present-back', '', 400, 'easeInOutQuad')
        .switchClass('card--off', '', 400, 'easeInOutQuad');

    cardFront.removeAttr('style');
    dataSafeHint.switchClass('confirm-form__hint--off', '', 400, 'easeInOutQuad');
    cardFront.find('.card__title').switchClass('card__title--anim-minimize', '', 400, 'easeInOutQuad');


    Card.resetState();
    codeConfirm.addClass('card__code-confirm--off');
    codeConfirm.removeClass('card__code-confirm--end');

    grid.switchClass('confirm-card__grid--anim-present', '', 400, 'easeInOutQuad');

    setTimeout(function () {
      grid.removeAttr('style');
      cardBack.removeAttr('style');
      menuCards.removeAttr('style');
      fieldPancode.removeAttr('style');
      dataSafeHint.removeAttr('style');
    }, 400);
  };




  function Request() { }

  /**
   *  Gets saved user cards from database.
   *  And Switch layout to User Cards screen or Add new Card.
   */
  Request.prototype.getSavedCards = function () {
    var param = {
      account_type: trsfLoadData.account_type,
      mobile_phone: trsfLoadData.mobile_phone,
      api_key: trsfLoadData.api_key
    };

    setTimeout(function () {

      // CHANGE: AJAX immitation
      var response = {
        "result": true,
        "list": [
          {
            "bank": {
              "color": "yellow",
              "logo": "https://testgate.paymo.ru/static/public/img/bank_logo/tinkoff.png",
              "name": "TINKOFF"
            },
            "active": true,
            "pan": ["546911", "1111"],
            "card_sub_type": false,
            "is_default": true,
            "card_type": "mc",
            "bank_name": "TINKOFF",
            "id": 1
          },
          {
            "bank": {
              "color": "yellow",
              "logo": "https://testgate.paymo.ru/static/public/img/bank_logo/tinkoff.png",
              "name": "TINKOFF"
            },
            "active": true,
            "pan": ["546911", "1111"],
            "card_sub_type": false,
            "is_default": true,
            "card_type": "mc",
            "bank_name": "TINKOFF",
            "id": 2
          }
        ]
      };

      menuCards.removeClass('confirm-card__menu--off');
      addCard.removeClass('confirm-card__item--off');

      $('.card__code-confirm')
        .addClass('card__code-confirm--off')
        .removeClass('card__code-confirm--end');

      if (response.list.length > 0) {

        Layout.generateCardGrid(response);
        Layout.goUserCards(response.list.length);
        if (response.list.length < 3) {
          $('.card--mini').first().click();
          Validator.validateForm.call()
        }
      } else {
        userCards.removeClass('confirm-card__item--off');
        Layout.showAddCard();
      }

      confirmWrapper.removeClass('confirm-form__wrapper--in-progress');
    }, 300);

    /**  CHANGE: AJAX immitation — disabled for request immitation
    $.ajax({
      url: '/request/',
      type: 'POST',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify({
        cls: '',
        body: param,
      }),

      success: function (response) {
        menuCards.removeClass('confirm-card__menu--off');
        addCard.removeClass('confirm-card__item--off');

        $('.card__code-confirm')
          .addClass('card__code-confirm--off')
          .removeClass('card__code-confirm--end');

        if (response.list.length > 0) {

          Layout.generateCardGrid(response);
          Layout.goUserCards(response.list.length);
          if (response.list.length < 3) {
            $('.card--mini').first().click();
            Validator.validateForm.call()
          }
        } else {
          userCards.removeClass('confirm-card__item--off');
          Layout.showAddCard();
        }

        confirmWrapper.removeClass('confirm-form__wrapper--in-progress');
      },
      error: function (xhr, status, error) {
        var err = eval("(" + xhr.responseText + ")").errors[0];
      }
    });
    */
  };


  /**
   *  Send Ajax Requst for checking correct sms_code.
   *  And have 3 user-cases:
   *  1. redirect to 4 step with success state;
   *  2. redirect to 4 step with failure staet;
   *  // 3. return to 2 step for set correction card data.
   *  @param {Event} e - click event
   */
  Request.prototype.codeSubmit = function (e) {
    var sendData = {
      sms_code: fieldCode.val().toString(),
      oferta: true,
      transaction: trsfLoadData.transaction,
      api_key: trsfLoadData.api_key,
    };

    btnCodeSubmit.addClass('confirm-blue--in-progress');
    btnCodeSubmit
        .attr('disabled', 'disabled')
        .prev()
        .attr('disabled', 'disabled');


    setTimeout(function () {
      var msg = {
        "result": true,
        "state": 3,
      }
      // if success request
      if (true) {
        btnCodeSubmit
          .removeClass('confirm-blue--in-progress')
          .removeAttr('disabled')
          .prev()
          .removeAttr('disabled');

        if (msg.result && msg.state === 6) window.location.href = msg.redirect;
        if (msg.result && msg.state === 3) Layout.animateCardsConfirmReverse();

      } else {
        // console.log('-------------- SMS deny');
        btnCodeSubmit
          .removeClass('confirm-blue--in-progress')
          .removeAttr('disabled')
          .prev()
          .removeAttr('disabled');
        fieldCode.addClass('card__field--error');
        codeHintError.removeClass('confirm-form__code-error--off');
      }
    }, 300);


    /**
      $.ajax({
        url: '/request/',
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify({
          cls: 'Payment',
          body: sendData,
        }),

        success: function(msg) {
          btnCodeSubmit
            .removeClass('confirm-blue--in-progress')
            .removeAttr('disabled')
            .prev()
            .removeAttr('disabled');

          if (msg.result && msg.state === 6) {
            window.location.href = msg.redirect;
          } else {
          }
        },

        error: function(msg) {
          // console.log('-------------- SMS deny');
          btnCodeSubmit
            .removeClass('confirm-blue--in-progress')
            .removeAttr('disabled')
            .prev()
            .removeAttr('disabled');
          fieldCode.addClass('card__field--error');
          codeHintError.removeClass('confirm-form__code-error--off');
        }
      });
    */
  };

  /**
   *  Get commission from database by ajax request.
   */
  Request.prototype.getCommission = function () {
    var setData = {
      api_key: trsfLoadData.api_key,
      transaction: trsfLoadData.txId,
      amount: trsfLoadData.amount,
      pan: '000000',
    };
    function fixedToNums(value) {
      var summary;

      if (value.toString().indexOf('.') >= 0) {
        summary = value.toFixed(2);
      } else {
        summary = value;
      }

      return summary;
    }
    //set price
    $('.popup-info__price .popup-info__number')
      .html(fixedToNums(+trsfLoadData.amount) + '<span class="rouble-bold">₽</span>');



    // CHANGE: AJAX immitation
    setTimeout(function () {
      var response = {"commission": 10.0, "amount": 130.0, "result": true};

      var cnum = $('.popup-info__price-commission .popup-info__number');
      if (response.result) {
        cnum.html(fixedToNums(response.amount) + '<span class="rouble-regular">₽</span>');
      }
    }, 500);


    /** CHANGE: AJAX

    $.ajax({
      url: '/request/',
      type: 'POST',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify({
        cls: 'Commission',
        body: setData,
      }),

      success: function (response) {
        var cnum = $('.popup-info__price-commission .popup-info__number');

        if (response.result) {
          cnum.html(fixedToNums(response.amount) + '<span class="rouble-regular">₽</span>');
        }
      },
      error: function (xhr, status, error) { }
    });
    */

  };




  // Creating new session
  function Payment() { }

  /**
   *  Send Ajax Requst for create user session with current card.
   *  Redirect to failure page or continue payment session.
   */
  Payment.prototype.startSession = function () {
    var sendData = {
      account_type: trsfLoadData.account_type,
      account_id: trsfLoadData.mobile_phone,
      mobile_phone: trsfLoadData.mobile_phone,
      transaction: trsfLoadData.transaction,
      description: trsfLoadData.description,
      api_key: trsfLoadData.api_key,
      amount: trsfLoadData.amount,
      merchandise: trsfLoadData.merchandise,
      custom_data: trsfLoadData.custom_data,
      fail_redirect: trsfLoadData.fail_redirect,
      success_redirect: trsfLoadData.success_redirect,
    };

    console.log('startSession');

    // CHANGE: AJAX immitation
    setTimeout(function () {
       Payment.payFirstTime();
    }, 500);

    /** AJAX
    $.ajax({
      url: '/request/',
      type: 'POST',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify({
        cls: 'Create',
        body: sendData
      }),

      success: function (msg, stat, xhr) {
        // if (xhr.status !== 200) window.location.href = trsfLoadData.fail_redirect;
        Payment.payFirstTime();
      },
      error: function (msg) {
        // window.location.href = trsfLoadData.fail_redirect;
      }
    });
    */
  };


  /**
   *  Send payment request. It's mean that user want to pay.
   */
  Payment.prototype.payFirstTime = function () {
    // console.log('-------------- send data');

    var cardState = Card.getState();
    var sendData = {
      account_type: trsfLoadData.account_type,
      account_id: trsfLoadData.mobile_phone,
      api_key: trsfLoadData.api_key,
      transaction: trsfLoadData.transaction,
      pan: cardState.pancode,
      expire: cardState.expire,
      cvc: cardState.cvv,
      mobile_phone: trsfLoadData.mobile_phone,
      oferta: cardState.agree,
      remember: cardState.agree,
    };

    if(!!cardState.id) {
        delete sendData['pan'];
        delete sendData['expire'];
        delete sendData['cvc'];
        sendData.card_id = cardState.id;
    }

    // CHANGE: AJAX immitation
    setTimeout(function () {
      var msg = {
        "state": 2,
        "redirect": "",
      }

      var xhr = {
        "status": 200,
      }

      if (xhr.status !== 200) window.location.href = trsfLoadData.fail_redirect;
      btnPayment.removeClass('confirm-blue--in-progress');
      Payment.redirectAfterPay(msg);
    }, 500)


    /** AJAX ORIGIN
    $.ajax({
      url: '/request/',
      type: 'POST',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify({
        cls: 'Payment',
        body: sendData,
      }),

      success: function (msg, stat, xhr) {
        // if (xhr.status !== 200) window.location.href = trsfLoadData.fail_redirect;
        btnPayment.removeClass('confirm-blue--in-progress');
        Payment.redirectAfterPay(msg);
      },
      error: function (msg) {
        btnPayment.removeClass('confirm-blue--in-progress');
        // window.location.href = trsfLoadData.fail_redirect;
      }
    });
    */
  };

  /**
   *  Redirect when arrived success code,
   *  or send hidden form
   *  or return to step 2.
   *  @param {json} msg - json response after success payment request
   */
  Payment.prototype.redirectAfterPay = function (msg) {
    if (msg.state === 3) {
      if (!!msg.redirect) {
        document.location.href = msg.redirect;
      } else {
        formRequestHidden.attr('action', msg.acsUrl);
        formRequestHiddenMD.val(msg.MD);
        formRequestHiddenPaReq.val(msg.paReq);
        formRequestHiddenTermUrl.val(msg.termUrl);
        formRequestHidden.submit();
      }
    } else if (msg.state === 2) {
      Layout.animateCardsToConfirm();
      $('.card__code-confirm')
        .removeClass('card__code-confirm--off')
        .addClass('card__code-confirm--end', 400, 'easeInOutSine');
    }
  };

  /**
   *  Start payment request chain.
   *  @param {Event} e
   */
  Payment.prototype.paymentCard = function (e) {
    e.preventDefault();
    btnPayment.addClass('confirm-blue--in-progress');
    Payment.startSession();
  };


  /**
   *  Check symbol on valid input value.
   *  @param {Event} e - keydown/press/up event
   */
  function validateSymbol(e) {
    var key = e.which;
    return (isUtilKey(e) || (key >= KEYS.PAD0 && key <= KEYS.PAD9)
        || ( e.ctrlKey  && (key === KEYS.X || key === KEYS.C || key === KEYS.V || key === KEYS.Z || key === KEYS.A))
        || (!e.shiftKey && (key >= KEYS.NUM0 && key <= KEYS.NUM9)));
  }

  /**
   *  Check util symbols
   *  @param {Event} e - keydown/press/up event
   */
  function isUtilKey(e) {
    var key = e.which;
    return (key === KEYS.BACKSPACE || key === KEYS.DELETE || key === 0 || key === KEYS.TAB
        || (key >= KEYS.F1 && key <= KEYS.F12) || (key >= KEYS.PAGEUP && key <= KEYS.DOWN));
  }

  /**
   *  Check on key-combination (when key was press with shift/ctrl)
   *  @param {Event} e - keydown/press/up event
   */
  function isSimpleKey(e) {
    var key = e.which;
    return !((e.shiftKey || e.ctrlKey) && ((key >= KEYS.NUM0 && key <= KEYS.NUM9) || (key >= KEYS.PAD0 && key <= KEYS.PAD9)));
  }

  /*
  ** Returns the caret (cursor) position of the specified text field.
  ** Return value range is 0-field.value.length.
  */
  function getCursorPosition(field) {
    var iCaretPos = 0;
    // IE Support
    if (document.selection) {
      field.focus();
      var oSel = document.selection.createRange();
      oSel.moveStart('character', -field.value.length);
      iCaretPos = oSel.text.length;
    } else if (field.selectionStart || field.selectionStart == '0') {
      // Firefox support
      iCaretPos = field.selectionStart;
    }

    return iCaretPos;
  }


  var Card = new Card();
  var Validator = new Validator();
  var Layout  = new Layout();
  var Request = new Request();
  var Payment = new Payment();

  Request.getSavedCards();
  Request.getCommission();


  // UI Events initialization

  fieldPancode.on('keydown', Validator.validateKey)
        .on('keyup',   Card.changeFocus)
        .on('keyup',   Validator.pancodeHandler)
        .on('blur',    Validator.validateField)
        .on('blur',    Validator.validateForm);

  fieldDate.on('keydown', Validator.validateKey)
        .on('keydown', Validator.dateHandler)
        .on('keyup',   Card.changeFocus)
        .on('blur',    Validator.validateField)
        .on('blur',    Validator.validateForm);

  fieldCode.on('keydown', Validator.validateKey)
        .on('keyup',   Validator.codeHandler);

  fieldCCV.on('keydown',  Validator.validateKey)
        .on('keyup',    Card.changeFocus)
        .on('blur',     Validator.validateField)
        .on('blur',     Validator.validateForm);

  addCard.on(  'click', Layout.showAddCard);
  userCards.on('click', Layout.goUserCards);

  checkboxAgree.on('change', Validator.validateForm);
  btnCodeSubmit.on('click', Request.codeSubmit);


  checkboxAgree.prop('checked', true);
  Card.setState({ agree: true });
})(jQuery);
