var actionsToDisplay = {};
var inputActions = {};
//formularz wyświetlający konieczne akcje po logowaniu
var ShowNextStepForm = function(requiredActions) {
    //tabela obsługująca akcje otrzymane z backendu
    var supportedActions = {
        haveToSpecifyThatCanAcceptRulesByHimself: {
            domId: 'ageQuestionAndEmail',
            title: 'Logowanie do systemu Synergia'
        },
        passwordChangeRequired: {
            domId: 'changePassword',
            title: 'Logujesz się po raz pierwszy lub Twoje hasło zostało zmienione'
        },
        emailRequired: {
            domId: 'filInEmail',
            title: 'Logowanie do systemu Synergia'
        },
        nameRequired: {
            domId: 'filInName',
            title: 'Logowanie do systemu Synergia'
        },
        haveToSpecifyThatCanAgreeForDataTransfer: {
            domId: 'ageQuestionAndEmail',
            title: 'Przyznaj uprawienia'
        },
        rulesAcceptanceRequired: {
            domId: 'acceptRulesByMyself',
            title: 'Logowanie do systemu Synergia'
        },
        antoherIntegrationInProgress: {
            domId: 'synergiaInProgress',
            title: 'Logowanie do systemu Synergia'
        }
    };

    //wypełninie tabeli InputActions akcjami, które przyszły z backendu

    $.each(requiredActions, function( index, actionData ) {
        if (supportedActions[actionData.code]) {
            actionsToDisplay[supportedActions[actionData.code].domId] = {};
            actionsToDisplay[supportedActions[actionData.code].domId].title = supportedActions[actionData.code].title;
        }

        inputActions[actionData.code] = actionData;
    });

    //ładujemy widok wszystkich akcji
    var content = $('<div class="fullHeight d-flex flex-column" id="formContent">').load("/OAuth/html_templates/actionRequired.html?0.96", function() {
        var actionsContainer = $(content).find('#step2actions');
        //usunięcie formularzy nie są wykorzystywane w danej kombinacji widoku
        $(actionsContainer).find('> div').each(function (index, actionDiv) {
            if (!actionsToDisplay[actionDiv.id]) {
                $(actionDiv).remove();
            }
        });

        if (inputActions.antoherIntegrationInProgress) {
            if(inputActions.antoherIntegrationInProgress.additionalData) {
                $(content).find('#synergiaInProgress .parentEmailContainer').text(inputActions.antoherIntegrationInProgress.additionalData.parentEmail);
            }
        }

        if (inputActions.nameRequired) {
            if(inputActions.nameRequired.additionalData) {
                $(content).find('input[name=FirstName]').val(inputActions.nameRequired.additionalData.firstName);
                $(content).find('input[name=LastName]').val(inputActions.nameRequired.additionalData.lastName);
            }
        }

        var title = 'Logowanie do systemu Synergia';
        //dostosowanie widoku w zależności od haveToSpecifyThatCanAcceptRulesByHimself i haveToSpecifyThatCanAgreeForDataTransfer
        if (inputActions.haveToSpecifyThatCanAcceptRulesByHimself) {
            if (inputActions.haveToSpecifyThatCanAgreeForDataTransfer) {
                removeAgeOption($(content), 'less13');
                removeAgeOption($(content), 'greater16');
                removeAgeOption($(content), 'greater13');
                removeAgeOption($(content), 'less16');
                if (inputActions.passwordChangeRequired) {
                    title = 'Logujesz się po raz pierwszy, uzupełnij poniższe dane';
                } else {
                    title = 'Określ kategorię wiekową';
                }
            } else {
                removeAgeOption($(content), 'between13and16');
                removeAgeOption($(content), 'less16');
                removeAgeOption($(content), 'greater16');
                removeAgeOption($(content), 'less13_3state');
                removeAgeOption($(content), 'greater16_3state');
                title = 'Określ kategorię wiekową';
                if (!inputActions.passwordChangeRequired) {
                    title = 'Określ kategorię wiekową';
                }
            }
        } else {
            if (inputActions.haveToSpecifyThatCanAgreeForDataTransfer) {
                removeAgeOption($(content), 'between13and16');
                removeAgeOption($(content), 'less13');
                removeAgeOption($(content), 'greater13');
                removeAgeOption($(content), 'less13_3state');
                removeAgeOption($(content), 'greater16_3state');
                if (inputActions.passwordChangeRequired) {
                    title = 'Zmień hasło i uzupełnij poniższe dane';
                } else {
                    title = 'Określ kategorię wiekową';
                }
            }
        }
        changeViewTitle(title);

        $(content).find('input').on('change', inputChanged);
        $(content).find('input').on('keyup', inputChanged);
        //zdarzenie zmiany comboboxa wieku
        $(content).find('select[name="age"]').on('change', function (event){
            $(event.target).removeClass('no-value');
            $(event.target).find('option[value=""]').remove();
            var selectedValue = event.target.value;
            $(content).find('.subOptions > div').each(function (index, subOptionElement) {
                const optionElement = $(subOptionElement);
                if(optionElement.data(selectedValue) == true) {
                    optionElement.show();
                    optionElement.attr('aria-hidden', false);
                } else {
                    optionElement.hide();
                    optionElement.attr('aria-hidden', true);
                }
            });
            const valueLabellyBy = $('#' + selectedValue);
            var parentEmail = $('#ageQuestionAndEmail').find('input[name="parentEmail"]');
            if (valueLabellyBy.length >0) {
                parentEmail.attr('aria-labelledby', selectedValue);
            } else {
                parentEmail.removeAttr('aria-labelledby');
            }
            notifyResizing();
        }).on('click', function (event){
            $(event.target).removeClass('no-value');
        });

        //wyświetlamy formularz
        $('#AuthorizationForm').empty();
        $('#AuthorizationForm').html(content);
        notifyResizing();
        replaceHrefIfInAppBrowser();
        collapseFinishNotfiy();
        $('#SendBtn').on('click', clickedSendActionSubmitButton);
    });
};

/**
 * Funkcja wywoływana po kliknięciu na przycisk Dalej w drugim kroku formularza (zmiana hasła itp)
 */
var clickedSendActionSubmitButton = function()
{
    $('.errorContainer').empty();
    var errorCount = 0;
    var errorsInputArray = [];
    //błedy ogólne (z backendu)
    if (actionsToDisplay['changePassword']) {
        var currentPass = $('#CurrentPass').val();
        var newPass = $('#NewPass').val();
        var newPass2 = $('#NewPass2').val();
        if (currentPass.trim() == '') {
            var currentPassElement = $('#CurrentPass');
            errorCount += displayErrorFieldMessage(currentPassElement, '#CurrentPassRow', 'Nie podano obecnego hasła.', 'current-pass-error');
            errorsInputArray.push(currentPassElement);
        }

        if (newPass.trim() == '') {
            var newPassElement = $('#NewPass');
            errorCount += displayErrorFieldMessage(newPassElement, '#NewPassRow', 'Nie podano nowego hasła.', 'new-pass-error');
            errorsInputArray.push(newPassElement);
        }

        if (newPass2.trim() == '') {
            var newPass2Element = $('#NewPass2');
            errorCount += displayErrorFieldMessage(newPass2Element, '#NewPass2Row', 'Nie powtórzono nowego hasła.', 'new-pass2-error');
            errorsInputArray.push(newPass2Element);
        }

        if (newPass2.trim() && newPass.trim() != newPass2.trim()) {
            var newPass2Element = $('#NewPass2');
            errorCount += displayErrorFieldMessage(newPass2Element, '#NewPass2Row', 'Podane hasła różnią się.', 'new-pass2-error');
            errorsInputArray.push(newPass2Element);
        }
    }

    //walidacja mojego emaila
    if (actionsToDisplay['filInEmail']) {
        var email = $('#Email').val();
        if (email.length > 0 && !validateEmail(email)) {
            var emailElement = $('#Email');
            errorCount += displayErrorFieldMessage(emailElement, '#filInEmail', 'Podany adres e-mail jest nieprawidłowy.', 'email-error');
            errorsInputArray.push(emailElement);
        }
    }

    ///walidacja imienia i nazwiska
    if (actionsToDisplay['filInName']) {
        var firstName = $('#FirstName').val();
        if (firstName.trim() == '') {
            var firstNameElement = $('#FirstName');
            errorCount += displayErrorFieldMessage(firstNameElement, '#firstNameContainer', 'Podanie imienia jest wymagane.', 'firstname-error');
            errorsInputArray.push(firstNameElement);
        }

        var lastName = $('#LastName').val();
        if (lastName.trim() == '') {
            var lastNameElement = $('#LastName');
            errorCount += displayErrorFieldMessage(lastNameElement, '#lastNameContainer', 'Podanie nazwiska jest wymagane.', 'lastname-error');
            errorsInputArray.push(lastNameElement);
        }
    }

    //walidacja wieku i pochodnych (email rodzica i regulamin)
    if(actionsToDisplay['ageQuestionAndEmail']) {
        var $validateEmail = false;
        var $validateAccept = false;
        switch ($('#ageQuestionAndEmail').find('select[name="age"]').val()) {
            case 'less13':
            case 'less13_3state':
                $validateEmail = true;
                break;
            case 'greater13':
                $validateAccept = true;
                break;
            case 'between13and16':
                $validateEmail = true;
                $validateAccept = true;
                break;
            case 'less16':
                $validateEmail = true;
                break;
            case 'greater16':
                break;
            case 'greater16_3state':
                $validateAccept = true;
                break;
            case '':
                var selectAgeElement = $('#ageQuestionAndEmail');
                errorCount += displayErrorFieldMessage(selectAgeElement, '#ageSelector', 'Wybierz kategorię wiekową.', 'age-error');
                errorsInputArray.push(selectAgeElement.find('select[name="age"]'));
                break;
        }

        if ($validateAccept) {
            var regAcceptElement = $('#RegAccept');
            if (!regAcceptElement.is(':checked')) {
                errorCount += displayErrorFieldMessage(regAcceptElement, '#acceptRules', 'Akceptacja regulaminu jest wymagana.', 'accept-rules-error');
                errorsInputArray.push(regAcceptElement);
            }
        }

        if ($validateEmail) {
            var parentEmail = $('#ageQuestionAndEmail').find('input[name="parentEmail"]').val();
            var parentEmailElement = $('#ageQuestionAndEmail').find('input[name="parentEmail"]');
            if (parentEmail.length == 0) {
                errorCount += displayErrorFieldMessage(parentEmailElement, '#parentEmail', 'Podanie adresu e-mail rodzica/opiekuna jest wymagane.', 'parent-email-error');
                errorsInputArray.push(parentEmailElement);
            } else {
                if (!validateEmail(parentEmail)) {
                    errorCount += displayErrorFieldMessage(parentEmailElement, '#parentEmail', 'Podany adres e-mail rodzica/opiekuna jest nieprawidłowy.', 'parent-email-error');
                    errorsInputArray.push(parentEmailElement);
                }
            }
        }
    }
    if (actionsToDisplay['acceptRulesByMyself']) {
        var regAcceptMyselfElement = $('#RegAcceptMyself');
        if (!regAcceptMyselfElement.is(':checked')) {
            errorCount += displayErrorFieldMessage(regAcceptMyselfElement, '#acceptRulesMyself', 'Akceptacja regulaminu jest wymagana.', 'accept-rules-myself-error');
            errorsInputArray.push(regAcceptMyselfElement);
        }
    }

    if(errorCount) {
        showErrors('.errorContainer');
        if (errorsInputArray.length > 0) {
            errorsInputArray[0].trigger('focus');
        }
        notifyResizing();
    } else {
        turn_preloader_on();
        //ustawiamy parametry do backendu
        var ajaxData = {
            "currentPass": currentPass,
            "newPass": newPass,
            "newPass2": newPass2
        }
        //email użytkownika
        if (actionsToDisplay['filInEmail']) {
            if (email) {
                ajaxData['email'] = email;
            }
        }
        //email użytkownika
        if (actionsToDisplay['filInName']) {
            if (firstName) {
                ajaxData['fName'] = firstName.trim();
            }
            if (lastName) {
                ajaxData['lName'] = lastName.trim();
            }
        }

        //akceptacja regulaminu przez usera
        if (actionsToDisplay['acceptRulesByMyself']) {
            ajaxData['rulesAccepted'] = $('#RegAcceptMyself').is(':checked') ? 1 : 0;
        }

        //wiek i pochodne
        if(actionsToDisplay['ageQuestionAndEmail']) {
            var parentEmail = $('#ageQuestionAndEmail').find('input[name="parentEmail"]').val();
            var rulesAccepted = ($('#RegAccept').is(':checked') ? 1 :0);
            switch ($('#ageQuestionAndEmail').find('select[name="age"]').val()) {
                case 'less13':
                    ajaxData['parentEmail'] = parentEmail;
                    ajaxData['canAcceptRules'] = 0;
                    break;
                case 'less13_3state':
                    ajaxData['parentEmail'] = parentEmail;
                    ajaxData['canAcceptRules'] = 0;
                    ajaxData['canAgreeOnDataTransfer'] = 0;
                    break;
                case 'greater13':
                    ajaxData['canAcceptRules'] = 1;
                    ajaxData['rulesAccepted'] = rulesAccepted;
                    break;
                case 'between13and16':
                    ajaxData['parentEmail'] = parentEmail;
                    ajaxData['canAcceptRules'] = 1;
                    ajaxData['rulesAccepted'] = rulesAccepted;
                    ajaxData['canAgreeOnDataTransfer'] = 0;
                    break;
                case 'less16':
                    ajaxData['parentEmail'] = parentEmail;
                    ajaxData['canAgreeOnDataTransfer'] = 0;
                    break;
                case 'greater16':
                    ajaxData['canAgreeOnDataTransfer'] = 1;
                    break;
                case 'greater16_3state':
                    ajaxData['canAgreeOnDataTransfer'] = 1;
                    ajaxData['canAcceptRules'] = 1;
                    ajaxData['rulesAccepted'] = rulesAccepted;
                    break;
            }

        }

        ajaxData['action'] = 'requiredActions';
        $.ajax({
            type: "POST",
            data: ajaxData,
            cache: false,
            async: true,
            success: function(newRes) {
                if(newRes.status == 'ok') {
                    finishProcess(newRes)
                } else {
                    turn_preloader_off();
                    notifyResizing();
                    // Error
                    $('#CurrentPass').empty();
                    $('#NewPass').empty();
                    $('#NewPass2').empty();
                    errorCount = 0;
                    for(var i = 0; i < newRes.Messages.length; ++i) {
                        errorCount += displayErrorMessage('#mainError', newRes.Messages[i]);
                    }
                    if (errorCount) {
                        showErrors('.errorContainer');
                    }
                }
            },
            error: function(jqxhr) {
                turn_preloader_off();
                /**
                 * @todo zrobić tu lepszą obsługę błędów!
                 */
                if (jqxhr.status >= 500) {
                    /**
                     * @todo zareagować odpowiednim komunikatem jeśli coś po stronie serwera wysiadło
                     */
                }

                var response = $.parseJSON(jqxhr.responseText);
                if (!response.hasOwnProperty('status')) {
                    /**
                     * @todo zareagować odpowiednim komunikatem. Jest to prawie jak 500 bo status musi zawsze być!
                     */
                }

                switch (response.status) {
                    case 'error':
                        $('.errorContainer').empty();
                        errorCount = 0;
                        for(var i = 0; i < response.errors.length; ++i) {
                            errorCount += displayErrorMessage(
                                '#mainError',
                                getErrorMessagefromCode(response.errors[i].code)
                            );

                        }
                        if (errorCount) {
                            showErrors('.errorContainer');
                        }
                        break;
                }
            }
        });
    }
};

var validateEmail = function($email) {
    var emailReg = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
    if( !emailReg.test( $email ) ) {
        return false;
    } else {
        return true;
    }
};

var getErrorMessagefromCode = function(code)
{
    var messages = {
        invalidCurrentPassword: 'Obecne hasło jest nieprawidłowe.',
        invalidNewPassword: 'Nowe hasło jest niezgodne z wytycznymi.',
        invalidEmail: 'Podany adres e-mail jest nieprawidłowy.',
        invalidParentEmail: 'Podany adres e-mail rodzica lub opiekuna jest nieprawidłowy.',
        notSynergiaUser: 'Logowanie jest możliwe tylko dla użytkowników LIBRUS Synergia.',
        invalidUserType: 'Dla podanego typu logowanie nie jest możliwe.',
        inactiveUser: 'Użytkownik jest nieaktywny. Logowanie nie jest możliwe.',
        commercialAppDisabled: 'Nie można powiązać konta z systemu Synergia.',
        jstAppDisabled: 'Nieprawidowy login i/lub hasło.',
        rodoUnsigned: 'Nie można powiązać konta z systemu Synergia. Prosimy o kontakt ze szkołą.',
        SamePassword: 'Nowe hasło musi się różnić od obecnego hasła.',
        NotStrongPassword: 'Podane hasło jest za słabe.',
        HashError: 'Inny błąd.',
        newPasswordNotGiven: 'Nie podano nowego hasła.',
        newPasswordWasNotRepeated: 'Uzupełnij pole Powtórz hasło.',
        newPasswordsWasNotSame: 'Podane hasła różnią się.',
        newPasswordSameAsOld: 'Nowe hasło musi być inne od aktualnie używanego.',
        currentPasswordNotGiven: 'Nie podano obecnego hasła.',
        parentEmailIsRequired: 'Podaj adres rodzica/opiekuna prawnego.',
        FirstNameTooShort: 'Podane imię jest za krótkie.',
        FirstNameTooLong: 'Podane imię jest za długie.',
        LastNameTooShort: 'Podane nazwisko jest za krótkie',
        LastNameTooLong: 'Podane nazwisko jest za długie'
    };

    $.each(layoutMessages, function( key, value ) {
        messages[key] = value;
    });

    if (messages[code]) {
        return messages[code];
    }

    return null;
};

var finishProcess = function(newRes)
{
    var template = '';
    var title = 'Przyznaj uprawnienia';
    if (newRes.rulesEmailSent && newRes.scopesEmailSent) {
        template = 'rulesAndScopesEmailSent';

    } else if (newRes.scopesEmailSent) {
        template = 'scopesEmailSent';
    } else if (newRes.rulesEmailSent) {
        title= 'Akceptacja regulaminu';
        template = 'rulesEmailSent';
    }
    if (template) {
        changeViewTitle(title);
        var content = $('<div class="fullHeight d-flex flex-column" id="formContent">').load("/OAuth/html_templates/" + template + ".html", function () {
            var parentEmail = $('input[name="parentEmail"]').val();
            var actionsContainer = $(content).find('#step2actions');
            $(content).find('#parentEmail').text(parentEmail);
            $(content).find('button').on('click', function (event) {
                turn_preloader_on();
                window.location.href = newRes.goTo;
            });
            $('#AuthorizationForm').empty().html(content);
            turn_preloader_off();
            notifyResizing();
            replaceHrefIfInAppBrowser();
        });
    } else {
        turn_preloader_on();
        window.location.href = newRes.goTo;
    }
};


/**
 * Usuwanie opcji z selecta wieku
 * @param parentElement
 * @param valueToRemove
 */
var removeAgeOption = function (parentElement, valueToRemove)
{
    $(parentElement).find('select[name="age"]').find('option[value="' + valueToRemove + '"]').remove();
};

var changeViewTitle = function(title)
{
    if (title) {
        $('#viewTitle').text(title);
    }
};

var closePupUpButtonClick = function()
{
    $(".selectSystemPopup").modal("close");
};

var clickedBackClicked = function()
{
    var newUrl = addParameterToUrl(redirectUrl, 'error', 'user_canceled');
    if (newUrl) {
        window.location.href = newUrl;
    }
};

var clearErrors = function(clearInputs) {
    $('.errorContainer').empty();
    $.each(clearInputs, function (index, value) {
        value.attr('aria-invalid', 'false');
        value.removeAttr('aria-describedby');
    });
};

var showErrors = function(errorContainer) {
    $(errorContainer).addClass('collapse show');
}

var clickedSendLoginSubmitButton = function()
{
    var login = $('#Login');
    var pass = $('#Pass');
    clearErrors([login, pass]);
    var errorCount = 0;
    var errorInputFocus = null;

    if(login.val().trim() == '') {
        errorCount += displayErrorFieldMessage(login, '#loginRow', 'Nie podano loginu.', 'login-error');
        errorInputFocus = login;
    }

    if(pass.val().trim() == '') {
        errorCount += displayErrorFieldMessage(pass, '#passwordRow', 'Nie podano hasła.', 'pass-error');
        if (!errorInputFocus) {
            errorInputFocus = pass;
        }
    }

    if(errorCount > 0) {
        showErrors('.errorContainer');
        errorInputFocus.trigger('focus');
        notifyResizing();
    } else {
        turn_preloader_on();
        var ajaxData = {
            "action": "login",
            "login": login.val(),
            "pass": pass.val()
        }

        if ($(".g-recaptcha-response").length != 0) {
            ajaxData['captcha'] = $(".g-recaptcha-response").val();
        }

        var turnips = Date.now()
            .toString()
            .split("")
            .map(function (l) {
                return String.fromCharCode(l.charCodeAt(0) + 20);
            })
            .join("")
        var preTurnips = Math.random()
            .toString()
            .split("")
            .map(function (l) {
                return String.fromCharCode(l.charCodeAt(0) + 20);
            })
            .join("")
        var headers = {};
        headers[String.fromCharCode(120, 45, 98, 97, 110, 101, 114)] = preTurnips + String.fromCharCode(95) + turnips;
        $.ajax({
            type: "POST",
            headers: headers,
            data: ajaxData,
            cache: false,
            async: true,
            dataType: 'json',
            success: function(response) {
                switch (response.status) {
                    case 'ok':
                        window.location.href = response.goTo;
                        break;
                    case 'actionRequired':
                        turn_preloader_off();
                        //Tutaj ma być przejście do widoku z dodatkowymi wymaganiami
                        ShowNextStepForm(response.actions);
                        break;
                }
                turn_preloader_off();
            },
            error: function(jqxhr) {

                /**
                 * @todo zrobić tu lepszą obsługę błędów!
                 */
                if (jqxhr.status >= 500) {
                    /**
                     * @todo zareagować odpowiednim komunikatem jeśli coś po stronie serwera wysiadło
                     */
                }

                var response = $.parseJSON(jqxhr.responseText);
                if (!response.hasOwnProperty('status')) {
                    /**
                     * @todo zareagować odpowiednim komunikatem. Jest to prawie jak 500 bo status musi zawsze być!
                     */
                }

                switch (response.status) {
                    case 'clientRestrictionsFailed':
                        turn_preloader_off();
                        $('.errorContainer').empty();
                        errorCount = 0;
                        //wyświetlamy popupy dla specjalnych błędów
                        var catchedMessages = popupMessages(response.errors);
                        for (var i = 0; i < response.errors.length; ++i) {
                            errorCount++;
                            //wyświetlamy tylko jesli nie przechwyciliśmy popupem
                            if (!catchedMessages[response.errors[i].code]) {
                                displayErrorMessage(
                                    '#mainError',
                                    getErrorMessagefromCode(response.errors[i].code)
                                );
                            }
                        }

                        if (errorCount > 0) {
                            const errorContainer = $('.errorContainer');
                            showErrors(errorContainer);
                            errorContainer.trigger('focus');
                        }
                        notifyResizing();
                        break;
                    case 'error':
                        turn_preloader_off();
                        pass.val('');
                        checkCaptcha();

                        $('.errorContainer').empty();
                        errorCount = 0;
                        for (var i = 0; i < response.errors.length; ++i) {
                            errorCount += displayErrorMessage('#mainError', response.errors[i].message);
                        }

                        if (errorCount > 0) {
                            const errorContainer = $('.errorContainer');
                            showErrors(errorContainer);
                            errorContainer.trigger('focus');
                        }
                        notifyResizing();
                        break;
                }
            }
        });
    }
};

var NoBlockUI = false;

$(function() {
    notifyResizing();
    turn_preloader_on();
    var currentLogin = null;
    var b = document.documentElement;
    if (isInAppLibrusBrowser()) {
        $('.backButton').addClass('LibrusApp');
        $('.backButton').on('click', clickedBackClicked);

    }

    $('#LoginBtn').button().click(clickedSendLoginSubmitButton);

    $('#Login').blur(function() {
        checkCaptcha();
    });

    $(document).on('keypress', 'input', function(event) {
        if(event.which == 13) {
            $(':focus').blur();
            $('#SendBtn, #LoginBtn').click();
        }
    });
    replaceHrefIfInAppBrowser();

    $('.LoginBox input').on('change', inputChanged);
    $('.LoginBox input').on('keyup', inputChanged);
    turn_preloader_off();
    $("#Login").focus();
    notifyResizing();

});

var checkCaptcha = function ()
{
    var login = $('#Login');
    NoBlockUI = true;
    $.ajax({
        url: "/OAuth/Captcha",
        type: "POST",
        data: "username=" + $.URLEncode(login.val()) + "&is_needed=1",
        cache: false,
        async: true,
        success: function(response) {
            if(response.is_needed) {
                $('#CaptchaBox').show();
                RefreshCaptcha();
            } else {
                $('#CaptchaBox').hide();
            }
        }
    });
    NoBlockUI = false;
};

/*
   Function: onloadCallback

   Function called when captcha loaded

   Returns:

      void.
*/
var onloadCallback = function()
{
    notifyResizing();
}

var RefreshCaptcha = function() {
    $.ajax({
        url: "/OAuth/Captcha",
        type: "POST",
        data: "username=" + $.URLEncode($('#Login').val()) + "&is_needed=1",
        cache: false,
        async: true,
        success: function(response) {
             if(response.is_needed) {
                 $('#CaptchaBox').show();
                 $('#CaptchaBox').html(response.reCaptchaCode);
                 notifyResizing();
             } else {
                 $('#CaptchaBox').html('');
                 $('#CaptchaBox').hide();
             }
        }
    });
};

//wywołane gdy jakiś input zmienił wartość - kolorujemy wiersz
var inputChanged = function(event)
{
    var inputElement = $(event.target);
    var ancestor = inputElement.parents('.style-row');
    if(ancestor.length) {
        if (inputElement.val().length == 0) {
            ancestor.removeClass('not-empty');
        } else {
            ancestor.addClass('not-empty');
        }
    }
};

var showSpecialMessagePopup = function(contentId)
{
    $('#showProblemsPopup div.messageContainer > div').each(function (index, actionDiv) {
        if ($(actionDiv).prop('id') == contentId) {
            $(actionDiv).show();
        } else {
            $(actionDiv).hide();
        }
    });
    $('#showProblemsPopup').modal('show');
};

var savedAction = null;
var openInNewWindow = null;
