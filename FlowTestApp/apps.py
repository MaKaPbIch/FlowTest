from django.apps import AppConfig


class FlowtestappConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'FlowTestApp'
    
    def ready(self):
        # Fix admin interface to prevent duplicates
        self.fix_admin_duplicates()
        
        # Import signals module to connect signals - do this last to avoid import errors
        try:
            import FlowTestApp.signals
        except ImportError:
            # Log the error but don't crash the application
            import logging
            logging.getLogger('django').warning("Could not import signals module. Some signals might not be connected.")
        
    def fix_admin_duplicates(self):
        """
        Patch the Django admin to prevent duplicate display of models.
        """
        from django.contrib import admin
        from django.db.models import QuerySet
        
        # Store original get_queryset method
        original_get_queryset = admin.ModelAdmin.get_queryset
        
        # Define patched method
        def patched_get_queryset(self, request):
            qs = original_get_queryset(self, request)
            # Apply distinct to all querysets in admin
            if hasattr(qs, 'distinct'):
                return qs.distinct()
            return qs
        
        # Apply the patch
        admin.ModelAdmin.get_queryset = patched_get_queryset