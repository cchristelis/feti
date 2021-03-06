# coding=utf-8
"""FETI landing page view."""

import os
from django.conf import settings
from django.core.management.base import BaseCommand

from feti.models.campus import Campus

__author__ = 'Irwan Fathurrahman <irwan@kartoza.com>'
__date__ = '07/09/16'
__license__ = "GPL"
__copyright__ = 'kartoza.com'


class Command(BaseCommand):
    def handle(self, *args, **options):
        # check the folder
        if not os.path.exists(settings.CACHE_DIR):
            os.makedirs(settings.CACHE_DIR)

        print("generate campus index start")
        # write course_strings cache
        filename = os.path.join(
            settings.CACHE_DIR,
            'campus_strings')

        # get data
        campuses = Campus.objects.all().order_by('provider__primary_institution')
        campuses_names = [
            campus.campus.strip()
            for campus in campuses if campus.campus]
        campuses_names = list(set(campuses_names))
        providers_names = [
            campus.provider.__unicode__().strip()
            for campus in campuses if campus.provider]
        providers_names = list(set(providers_names))
        campuses_names = campuses_names + providers_names
        campuses_names.sort()
        campuses_names = "\n".join(campuses_names)

        # safe to file
        file = open(filename, 'w', encoding='utf-8')
        file.write(campuses_names)  # python will convert \n to os.linesep
        file.close()  # you can omit in most cases as the destructor will call it
        print("generate campus index finish")
