__author__ = 'Christian Christelis <christian@kartoza.com>'
__date__ = '06/09/16'
__license__ = "GPL"
__copyright__ = 'kartoza.com'

# coding=utf-8
"""Model class for Occupations"""

from django.contrib.gis.db import models

from feti.models.learning_pathway import LearningPathway

class Occupation(models.Model):
    """A campus where a set of courses are offered."""
    id = models.AutoField(primary_key=True)
    occupation = models.CharField(max_length=150, blank=False, null=False)
    green_occupation = models.BooleanField(default=False)
    green_skill = models.BooleanField(default=False)
    description = models.CharField(max_length=500)
    tasks = models.TextField(blank=True, null=True)
    occupation_regulation = models.TextField(blank=True, null=True)
    learning_pathway_description = models.TextField(blank=True, null=True)
    learning_pathways = models.ManyToManyField(
        LearningPathway)  ## limit choices to not selected pathnumbers

    class Meta:
        app_label = 'feti'
        managed = True
