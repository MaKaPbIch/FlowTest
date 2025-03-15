/**
 * Custom JavaScript for enhancing the user creation form in the admin panel
 */

(function($) {
    // Execute when the DOM is fully loaded
    $(document).ready(function() {
        // Ensure the role select is properly styled and populated
        const roleSelect = $('#id_role');
        
        if (roleSelect.length) {
            // Make sure role dropdown is displayed properly
            roleSelect.css({
                'display': 'block',
                'width': '100%',
                'max-width': '500px',
                'padding': '8px 12px',
                'border': '1px solid #ccc',
                'border-radius': '4px'
            });
            
            // Add a placeholder option if there isn't one
            if (!roleSelect.find('option[value=""]').length) {
                roleSelect.prepend('<option value="">---------</option>');
            }
            
            // Set default language to Russian if available
            const languageSelect = $('#id_language');
            if (languageSelect.length && languageSelect.find('option[value="ru"]').length) {
                languageSelect.val('ru');
            }
        }
        
        // Add custom validation
        $('form').on('submit', function(e) {
            const usernameField = $('#id_username');
            const firstNameField = $('#id_first_name');
            const lastNameField = $('#id_last_name');
            
            // Simple validation
            let valid = true;
            
            if (usernameField.val().trim() === '') {
                highlightField(usernameField, 'Имя пользователя обязательно');
                valid = false;
            }
            
            if (firstNameField.val().trim() === '') {
                highlightField(firstNameField, 'Имя обязательно');
                valid = false;
            }
            
            if (lastNameField.val().trim() === '') {
                highlightField(lastNameField, 'Фамилия обязательна');
                valid = false;
            }
            
            if (!valid) {
                e.preventDefault();
                $('html, body').animate({
                    scrollTop: $(".errornote").length ? $(".errornote").offset().top : 0
                }, 500);
            }
        });
        
        // Make cancel button more visible
        const cancelLink = $('.submit-row a.closelink');
        if (cancelLink.length) {
            cancelLink.css({
                'background-color': '#ba2121',
                'color': 'white',
                'padding': '10px 15px',
                'border-radius': '4px',
                'display': 'inline-block',
                'text-align': 'center',
                'text-decoration': 'none',
                'font-weight': 'bold',
                'margin': '0 5px'
            });
        }
        
        // Make save button more visible
        const saveButton = $('.submit-row input[type="submit"].default');
        if (saveButton.length) {
            saveButton.css({
                'background-color': '#417690',
                'color': 'white',
                'padding': '10px 15px',
                'border-radius': '4px',
                'font-weight': 'bold',
                'min-width': '100px',
                'cursor': 'pointer',
                'margin': '0 5px'
            });
        }
    });
    
    // Helper function to highlight field with error
    function highlightField(field, message) {
        field.css('border-color', '#ba2121');
        
        // Add error message if it doesn't exist
        if (!field.parent().find('.errortext').length) {
            field.parent().append('<p class="errortext">' + message + '</p>');
        }
        
        // Add error class to the form row
        field.closest('.form-row').addClass('errors');
        
        // Add general error message at the top if it doesn't exist
        if (!$('.errornote').length) {
            $('form').prepend('<p class="errornote">Пожалуйста, исправьте ошибки ниже.</p>');
        }
    }
})(django.jQuery);